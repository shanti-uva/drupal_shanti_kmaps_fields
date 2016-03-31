(function ($) {

// Local "globals"
    var dictionary = {};
    var picked = {};
    var filtered = {};
    var ancestor_tree = {};
    var S = {}; // Settings passed
    var submit_count = 0;

    Drupal.behaviors.shantiKmapsFieldsTree = {

        attach: function (context, settings) {

            S = settings.shanti_kmaps_fields;

            // Event handler 0: On first load, go through each instance of the field and update its picklist
            $('.kmap_result_box').once(function () {
                var resultBox = $(this);
                var my_field = $(this).attr('id').replace('_result_box', '');
                var picked_already = $.parseJSON(S[my_field].picked_already);
                picked[my_field] = {}; // Init picklist for this field
                dictionary[my_field] = {}; // Init dictionary for this field
                for (kmap_id in picked_already) {
                    var item = picked_already[kmap_id];
                    picked[my_field][kmap_id] = item;
                    updateDictionary(kmap_id, item.id, item.header, item.path, my_field);
                    addPickedItem(resultBox, kmap_id, item);
                }
                trackTypeaheadSelected($('#' + my_field + '_search_term'), picked[my_field]);
            });

            // Event handler 1: Fetch search results and build a "pick tree"
            $('.kmap_search_button').once('kmaps-fields').on('click', function (e) {
                var my_field = $(this).attr('id').replace('_search_button', '');
                var pickTree = $('#' + my_field + '_pick_tree');
                var search_term = $('#' + my_field + '_search_term').val();
                pickTree.html("<p>Searching ...</p>");
                ancestor_tree[my_field] = {}; // reinit
                dictionary[my_field] = {}; // reinit
                search_url = S[my_field].kmap_url + search_term;
                $.getJSON(search_url, function (results) {
                    if (results.data.length != 0) {
                        pickTree.html("<p>We found " + results.meta.count + " item(s) containing the string /" + search_term + "/.</p>");
                        for (var i in results.data) {
                            var R = results.data[i];
                            var kmap_id = 'F' + R.id;
                            var path = ancestorsToPath(R.ancestors);
                            updateDictionary(kmap_id, R.id, R.header, path, my_field);
                            addAncestorsToDictionary(R.ancestors, my_field);
                            parsePath(R.ancestors, my_field); // populates ancestor_tree
                        }
                        // Need also to see if any of the new items are in the pick list ...
                        JSONTreeToHTML(my_field, ancestor_tree[my_field], pickTree, search_term);
                        pickTree.css({
                            'max-height': '350px',
                            'overflow': 'scroll',
                            'padding': '5px',
                            'margin-bottom': '5px',
                            'background': '#EEE'
                        });
                        Drupal.attachBehaviors(pickTree);
                    } else {
                        pickTree.html("No results for the string /" + search_term + "/. Click <a href='" + search_url + "' target='_blank'>here</a> to see if the KMaps server is working.");
                    }
                });
            });

            // Event handler 2: When kmap items are selected from the pick tree, cross them out
            // and populate the result box
            $('.kmap_pick_tree .kmap-item').once('kmaps-field').on('click', function (e) {
                var my_field = $(this).closest('.kmap_pick_tree').attr('id').replace('_pick_tree', '');
                var resultBox = $('#' + my_field + '_result_box');
                var kmap_header = $(this).html();
                var kmap_id = extractKMapID(kmap_header);
                if ($(this).hasClass('picked') && $(this).hasClass(kmap_id)) {
                    $('.selected-kmap.' + kmap_id).stop().css("background-color", "#FFFF9C").animate({backgroundColor: "#FFFFFF"}, 1500);
                } else {
                    picked[my_field][kmap_id] = dictionary[my_field][kmap_id]; // TRAP ERROR
                    addPickedItem(resultBox, kmap_id, dictionary[my_field][kmap_id]);
                    $(this).addClass('picked');
                }
            });

            // Event handler 3: When selected items are deleted, remove them and reset the item in the pick tree
            $('.kmap_result_box .delete-me').once('kmaps-fields').on('click', function (e) {
                var my_field = $(this).closest('.kmap_result_box').attr('id').replace('_result_box', '');
                var resultBox = $('#' + my_field + '_result_box');
                var pickedElement = $(this).parent();
                var kmap_id = extractKMapID($(this).next('span.kmap_label').html());
                //if (typeof $('#'+my_field+'_pick_tree .kmap-item.'+kmap_id).val() == 'undefined') { // TRUTH FAILS
                //  if (!confirm("This term "+kmap_id+" is not in the currently selected tree; if you delete it, you'll need to search for it again. Are you sure you want to delete it?")) return;
                //}
                delete picked[my_field][kmap_id];
                $('#' + my_field + '_pick_tree, #' + my_field + '_lazy_tree').find('.kmap-item.' + kmap_id + ', #ajax-id-' + kmap_id.substring(1)).removeClass('picked');
                trackTypeaheadSelected($('#' + my_field + '_search_term'), picked[my_field]);
                pickedElement.remove();
            });

            // Event handler 4: When the form is submitted, dump picked items into hidden form box
            // to send back to server
            // Need to pass the entity type so this can work with other entity types (i.e. node-form) ...
            $('form.node-form').submit(function (e) {
                submit_count++;
                if (submit_count > 1) return; // Need because submit gets called multiple times >:(
                for (my_field in picked) {
                    for (kmap_id in picked[my_field]) {
                        if (dictionary[my_field][kmap_id]) {
                            picked[my_field][kmap_id] = dictionary[my_field][kmap_id];
                        } else {
                            // This happens for existing kmap ids
                        }
                    }
                    $('#' + my_field + '_hidden_box').append(JSON.stringify(picked[my_field]));
                }
                return;
            });

            // Turn inputs into typeahead pickers if required
            $('.field-widget-kmap-typeahead-picker').once('kmaps-fields').each(function () {
                var $typeahead = $('.kmap_search_term', this);
                var my_field = $typeahead.attr('id').replace('_search_term', '');
                var admin = settings.shanti_kmaps_admin;
                var widget = settings.shanti_kmaps_fields[my_field];
                var root_kmapid = widget.root_kmapid ? widget.root_kmapid : widget.domain == 'subjects' ? admin.shanti_kmaps_admin_root_subjects_id : admin.shanti_kmaps_admin_root_places_id;
                $typeahead.kmapsTypeahead({
                    term_index: admin.shanti_kmaps_admin_server_solr_terms,
                    domain: widget.domain,
                    root_kmapid: root_kmapid,
                    max_terms: widget.term_limit == 0 ? 999 : widget.term_limit,
                    selected: 'class',
                    filters: admin.shanti_kmaps_admin_solr_filter_query ? admin.shanti_kmaps_admin_solr_filter_query : ''
                });
            });

            //Event handler for typeahead picking
            $('.kmap_search_term', '.field-widget-kmap-typeahead-picker').once('kmaps-pick').bind('typeahead:select',
                function (ev, sel) {
                    var my_field = $(this).attr('id').replace('_search_term', '');
                    pickTypeaheadSuggestion(my_field, sel);
                    trackTypeaheadSelected($('#' + my_field + '_search_term'), picked[my_field]);
                    $(this).typeahead('val', ''); //clear search field
                }
            );

            // Turn inputs into typeahead_tree pickers if required
            $('.field-widget-kmap-lazy-tree-picker, .field-widget-kmap-lazy-tree-filter-picker, .field-widget-kmap-typeahead-tree-picker').once('kmaps-fields').each(function () {
                var $typeahead = $('.kmap_search_term', this);
                var search = $typeahead.hasClass('kmap_no_search') ? false : true;
                var search_key = '';

                var my_field = $typeahead.attr('id').replace('_search_term', '');
                var $tree = $('#' + my_field + '_lazy_tree');
                var admin = settings.shanti_kmaps_admin;
                var widget = settings.shanti_kmaps_fields[my_field];
                var root_kmapid = widget.root_kmapid ? widget.root_kmapid : widget.domain == 'subjects' ? admin.shanti_kmaps_admin_root_subjects_id : admin.shanti_kmaps_admin_root_places_id;
                var root_kmap_path = widget.root_kmap_path ? widget.root_kmap_path : widget.domain == 'subjects' ? admin.shanti_kmaps_admin_root_subjects_path : admin.shanti_kmaps_admin_root_places_path;
                var base_url = widget.domain == 'subjects' ? admin.shanti_kmaps_admin_server_subjects : admin.shanti_kmaps_admin_server_places;

                $tree.kmapsTree({
                    termindex_root: admin.shanti_kmaps_admin_server_solr_terms,
                    kmindex_root: admin.shanti_kmaps_admin_server_solr,
                    type: widget.domain,
                    root_kmap_path: root_kmap_path,
                    baseUrl: base_url
                }).on('useractivate', function (ev, data) {
                    var event = data.event;

                    var origEvent = (event.originalEvent) ? event.originalEvent.type : "none";
                    if (event.type === "fancytreeactivate" && origEvent === "click") {
                        pickLazyTreeTerm(my_field, $.extend(data, {'domain': widget.domain}));
                        if (search) {
                            trackTypeaheadSelected($typeahead, picked[my_field]);
                            $typeahead.typeahead('val', search_key);
                        } //reset search term
                    } else if (event.type === "fancytreekeydown" && origEvent === "keydown") {
                        if (event.keyCode == 9 || event.keyCode == 13) { //TAB or ENTER pressed
                            pickLazyTreeTerm(my_field, $.extend(data, {'domain': widget.domain}));
                            if (search) {
                                trackTypeaheadSelected($typeahead, picked[my_field]);
                                $typeahead.typeahead('val', search_key);
                            } //reset search term
                        }
                    }
                });

                if (search) {
                    $typeahead.kmapsTypeahead({
                        menu: $('#' + my_field + '_menu_wrapper'),
                        term_index: admin.shanti_kmaps_admin_server_solr_terms,
                        domain: widget.domain,
                        root_kmapid: root_kmapid,
                        max_terms: widget.term_limit == 0 ? 999 : widget.term_limit,
                        min_chars: 1,
                        //empty_query: 'level_i:2',
                        //empty_query: 'id:' + widget.domain + '-' + root_kmapid,
                        //empty_sort: 'level_i ASC',
                        empty_limit: 10,
                        filters: admin.shanti_kmaps_admin_solr_filter_query ? admin.shanti_kmaps_admin_solr_filter_query : '',
                        no_results_msg: 'Showing the whole tree.'
                    }).kmapsTypeahead('onSuggest',
                        function (suggestions) {
                            if (suggestions.length == 0) {
                                $tree.kmapsTree('reset', function () {
                                    $tree.fancytree('getTree').getNodeByKey(root_kmapid).scrollIntoView(true);
                                });
                            }
                            else {
                                $tree.kmapsTree('showPaths',
                                    $.map(suggestions, function (val) {
                                        return '/' + val['doc']['ancestor_id_path'];
                                    }),
                                    function () {
                                        // mark already picked items - do it more efficiently?
                                        for (var kmap_id in picked[my_field]) {
                                            $('#ajax-id-' + kmap_id.substring(1), $tree).addClass('picked');
                                        }
                                        // scroll to top - doesn't work
                                        $tree.fancytree('getTree').getNodeByKey(root_kmapid).scrollIntoView(true);
                                    }
                                );
                            }
                        }
                    ).bind('typeahead:asyncrequest',
                        function () {
                            search_key = $typeahead.typeahead('val'); //get search term
                        }
                    ).bind('typeahead:select',
                        function (ev, suggestion) {
                            pickTypeaheadSuggestion(my_field, suggestion);
                            trackTypeaheadSelected($typeahead, picked[my_field]);
                            var id = suggestion.doc.id.substring(suggestion.doc.id.indexOf('-') + 1);
                            $('#ajax-id-' + id, $('#' + my_field + '_lazy_tree')).addClass('picked');
                            $typeahead.typeahead('val', search_key); //reset search term
                        }
                    ).bind('typeahead:cursorchange',
                        function (ev, suggestion) {
                            if (typeof suggestion != 'undefined') {
                                var tree = $tree.fancytree('getTree');
                                var id = suggestion.doc.id.substring(suggestion.doc.id.indexOf('-') + 1);
                                tree.activateKey(id);
                                tree.getNodeByKey(id).scrollIntoView();
                            }
                        }
                    ).on('input',
                        function () {
                            if (this.value == '') {
                                search_key = '';
                                $tree.kmapsTree('reset', function () {
                                    $tree.fancytree('getTree').getNodeByKey(root_kmapid).scrollIntoView(true);
                                });
                            }
                        }
                    );
                }
            });

            $('.kmap_filter_box').once(function () {
                var my_field = $(this).attr('id').replace('_filter_box', '');
                filtered[my_field] = {}; // Init filters for this field
            });

            $('.kmap_filter_box .delete-me').once('kmaps-fields').on('click', function (e) {
                var my_field = $(this).closest('.kmap_filter_box').attr('id').replace('_filter_box', '');
                var filterElement = $(this).parent();
                var kmap_id = extractKMapID($(this).next('span.kmap_label').html());
                var $typeahead = $('#' + my_field + '_search_term');
                var $filter = $('#' + my_field + '_search_filter');
                var mode = $(this).hasClass('kmaps-conjunctive-filter') ? 'AND' : 'OR';
                removeFilter($typeahead, 'feature_type_ids', filtered[my_field]);
                $(this).toggleClass('kmaps-conjunctive-filters', mode == 'AND');
                $filter.kmapsTypeahead('resetPrefetch');
                delete filtered[my_field][kmap_id];
                trackTypeaheadSelected($filter, filtered[my_field]);
                filterElement.remove();
                var fq = getFilter('feature_type_ids', filtered[my_field], mode);
                if (fq != null) {
                    $typeahead.kmapsTypeahead('addFilters', [fq]);
                    $filter.kmapsTypeahead('refacetPrefetch', fq);
                }
            });

            $('.kmap_search_filter').once('kmaps-fields').each(function () {
                var $filter = $(this);
                var my_field = $filter.attr('id').replace('_search_filter', '');
                var $typeahead = $('#' + my_field + '_search_term');
                var $filter_box = $('#' + my_field + '_filter_box');
                var admin = settings.shanti_kmaps_admin;
                var widget = settings.shanti_kmaps_fields[my_field];
                var root_kmap_path = widget.root_kmap_path ? widget.root_kmap_path : widget.domain == 'subjects' ? admin.shanti_kmaps_admin_root_subjects_path : admin.shanti_kmaps_admin_root_places_path;
                $filter.kmapsTypeahead({
                    term_index: admin.shanti_kmaps_admin_server_solr_terms,
                    domain: 'subjects', // default: Filter by subject
                    root_kmapid: 20, // default: Geographical features
                    ancestors: 'off',
                    min_chars: 0,
                    selected: 'omit',
                    prefetch_facets: 'on',
                    prefetch_field: 'feature_types',
                    prefetch_filters: ['tree:' + widget.domain, 'ancestor_id_path:' + root_kmap_path],
                    max_terms: widget.term_limit == 0 ? 999 : widget.term_limit,
                    filters: admin.shanti_kmaps_admin_solr_filter_query ? admin.shanti_kmaps_admin_solr_filter_query : ''
                }).bind('typeahead:select',
                    function (ev, suggestion) {
                        if (suggestion.count > 0) { // should not be able to select zero-result filters
                            $filter.typeahead('val', ''); // empty search field
                            removeFilter($typeahead, 'feature_type_ids', filtered[my_field]);
                            $filter.kmapsTypeahead('resetPrefetch');
                            var mode = suggestion.refacet ? 'AND' : 'OR';
                            pickTypeaheadFilter(my_field, suggestion);
                            $filter_box.toggleClass('kmaps-conjunctive-filters', mode == 'AND');
                            trackTypeaheadSelected($filter, filtered[my_field]);
                            var fq = getFilter('feature_type_ids', filtered[my_field], mode);
                            if (fq != null) {
                                $typeahead.kmapsTypeahead('addFilters', [fq]);
                                $filter.kmapsTypeahead('refacetPrefetch', fq);
                            }
                        }
                    }
                ).bind('typeahead:cursorchange',
                    function (ev, suggestion) {
                        if (suggestion === undefined) {
                            $filter.parent().find('.kmaps-tt-menu').scrollTop(0);
                        }
                    }
                );
            });
        },

        detach: function (context, settings) {

        }

    };

// Utility Functions

// Called within the search event handler
    function JSONTreeToHTML(my_field, tree, el, ulid, search_term, root_kmapid) {
        var ul = $("<ul/>");
        if (ulid) {
            ul.attr("id", ulid);
        }
        el.append(ul);
        var rgx2 = new RegExp(search_term, 'gi');
        for (item in tree) {
            var kmap_id = extractKMapID(item);
            var li = $("<li>" + item + "</li>").addClass('kmap-item').addClass(kmap_id);
            if (rgx2.exec(item) != null) li.addClass('matching');
            if (picked[my_field][kmap_id] != null) li.addClass('picked');
            li.appendTo(ul);
            var children = 0;
            for (k in tree[item]) {
                children++;
                break;
            }
            if (children) {
                JSONTreeToHTML(my_field, tree[item], ul, search_term);
            } else {
                li.addClass('terminal');
            }
        }
    }

    function parsePath(ancestors, cur_field) {
        var cur = ancestor_tree[cur_field];
        ancestors.slice(0).forEach(function (elem) {
            var key = elem.header + " F" + elem.id;
            cur[key] = cur[key] || {};
            cur = cur[key];
        });
    }

    function extractKMapID(line) {
        var kmap_id = null;
        var rgx1 = /\s(\w?\d+)$/;
        var matches = rgx1.exec(line);
        if (matches != null) {
            var kmap_id = matches[1];
        }
        return kmap_id;
    }

    function ancestorsToPath(ancestors) {
        var path = '';
        var copy = ancestors.slice(0); // Clone
        for (i in copy) {
            path += '{{' + copy[i].header + '}}';
        }
        return path;
    }

    function updateDictionary(kmap_id, id, header, path, cur_field) {
        dictionary[cur_field] = dictionary[cur_field] || {};
        dictionary[cur_field][kmap_id] = dictionary[cur_field][kmap_id] || {};
        dictionary[cur_field][kmap_id]['id'] = dictionary[cur_field][kmap_id]['id'] || id;
        dictionary[cur_field][kmap_id]['header'] = dictionary[cur_field][kmap_id]['header'] || header;
        dictionary[cur_field][kmap_id]['path'] = dictionary[cur_field][kmap_id]['path'] || path;
        dictionary[cur_field][kmap_id]['domain'] = dictionary[cur_field][kmap_id]['domain'] || S[cur_field].domain;
    }

    function addAncestorsToDictionary(ancestors, cur_field) {
        var copy = ancestors.slice(0); // Clone
        while (a = copy.pop()) {
            var kmap_id = 'F' + a.id;
            var path = ancestorsToPath(copy);
            updateDictionary(kmap_id, a.id, a.header, path, cur_field);
        }
    }

    function pickLazyTreeTerm(my_field, data) {
        var resultBox = $('#' + my_field + '_result_box');
        var id = data.key, kmap_id = 'F' + id;
        var item = {
            id: data.key,
            domain: data.domain,
            header: data.title,
            path: '{{' + data.path.substring(1).split('/').join('}}{{') + '}}'
        };
        if (!picked[my_field][kmap_id]) {
            picked[my_field][kmap_id] = item;
            addPickedItem(resultBox, kmap_id, item);
            $('#ajax-id-' + item.id, $('#' + my_field + '_lazy_tree')).addClass('picked');
        }
    }

    function pickTypeaheadSuggestion(my_field, suggestion) {
        var resultBox = $('#' + my_field + '_result_box');
        var split = suggestion.doc.id.split('-'), domain = split[0], id = split[1], kmap_id = 'F' + id; //split subjects-123
        var item = {
            id: id,
            domain: domain,
            header: suggestion.doc.header,
            path: '{{' + suggestion.doc.ancestors.join('}}{{') + '}}'
        };
        if (!picked[my_field][kmap_id]) {
            picked[my_field][kmap_id] = item;
            addPickedItem(resultBox, kmap_id, item);
        }
    }

    function pickTypeaheadFilter(my_field, suggestion) {
        var filterBox = $('#' + my_field + '_filter_box');
        var kmap_id = 'F' + suggestion.id;
        var item = {
            domain: 'subjects', // default
            id: suggestion.id,
            header: suggestion.value,
            path: '{{' + suggestion.id + '}}'
        };
        if (!filtered[my_field][kmap_id]) {
            filtered[my_field][kmap_id] = item;
            addPickedItem(filterBox, kmap_id, item);
        }
    }

    function trackTypeaheadSelected($typeahead, pickList) {
        if ($typeahead.length !== 0) {
            $typeahead.kmapsTypeahead('trackSelected', Object.keys(pickList).map(
                function (val) {
                    return pickList[val].id;
                })
            );
        }
    }

    function addFilter($typeahead, solrField, pickList, mode) {
        var fq = getFilter(solrField, pickList, mode);
        if (fq != null) {
            $typeahead.kmapsTypeahead('addFilters', [fq]);
        }
    }

    function removeFilter($typeahead, solrField, pickList) {
        // to be safe, remove both 'OR' and 'AND'
        var fq = getFilter(solrField, pickList, 'OR');
        if (fq != null) {
            $typeahead.kmapsTypeahead('removeFilters', [fq, getFilter(solrField, pickList, 'AND')]);
        }
    }

    function getFilter(solrField, pickList, mode) {
        var filter = Object.keys(pickList).join(' ' + mode + ' ').replace(/F/g, ''); // remove 'F' prefix from numeric ids
        if (filter) {
            return solrField + ':(' + filter + ')';
        }
        else {
            return null;
        }
    }

// Function to create items in a picklist
    function addPickedItem(containerElement, kmap_id, item) {
        var pickedElement = $("<div/>").addClass('selected-kmap ' + kmap_id).appendTo(containerElement);
        var deleteButton = $("<span class='icon shanticon-close2'></span>").addClass('delete-me').addClass(kmap_id).appendTo(pickedElement);
        var elementLabel = $("<span>" + item.header + " " + kmap_id + "</span>").addClass('kmap_label').appendTo(pickedElement);
        pickedElement.attr({
            'data-kmap-id-int': item.id,
            'data-kmap-path': item.path,
            'data-kmap-header': item.header,
        });
        Drupal.attachBehaviors(pickedElement);
    }

})(jQuery);
