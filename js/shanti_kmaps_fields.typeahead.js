(function ($) {
    Drupal.behaviors.kmaps_typeahead = {
        attach: function (context, settings) {
            $('.field-widget-kmap-typeahead-picker', context).once('kmaps-search').find('.kmap_search_term').each(function () {
                var $input = $(this);
                var my_field = $input.attr('id').replace('_search_term', '');
                var admin_settings = settings.shanti_kmaps_admin;
                var widget_settings = settings.shanti_kmaps_fields[my_field];
                var index = admin_settings.shanti_kmaps_admin_server_solr_terms;
                var domain = widget_settings.domain;
                var limit = widget_settings.term_limit == 0 ? 999 : widget_settings.term_limit;
                var separator = ' - ';
                var field = 'name_autocomplete';
                var preq = '&q=' + field + ':';
                var filters = [];
                if (admin_settings.shanti_kmaps_admin_solr_filter_query) {
                    filters.push(admin_settings.shanti_kmaps_admin_solr_filter_query);
                }
                if (widget_settings.root_kmapid) {
                    filters.push('ancestor_ids_default:' + widget_settings.root_kmapid);
                }
                var params = {
                    'wt': 'json',
                    'indent': true,
                    'fq': filters.concat(['tree:' + domain]),
                    'fl': 'id,header,ancestors',
                    'rows': limit,
                    'hl': true,
                    'hl.fl': field,
                    'hl.simple.pre': '',
                    'hl.simple.post': ''
                };
                var url = index + '/select?' + $.param(params, true);
                var terms = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    remote: {
                        url: url,
                        prepare: function (query, settings) { //http://stackoverflow.com/questions/18688891/typeahead-js-include-dynamic-variable-in-remote-url
                            var val = $input.val();
                            if (val) {
                                settings.url += preq + encodeURIComponent(val.toLowerCase().replace(/\s/g, '\\ '));
                                //settings.url += preq + encodeURIComponent(val.replace(/\s/g, '\\ ') + '*');
                            }
                            return settings;
                        },
                        filter: function (json) {
                            return $.map(json.response.docs, function (doc) {
                                return {
                                    id: doc.id,
                                    header: doc.header,
                                    ancestors: doc.ancestors,
                                    anstring: doc.ancestors.slice(0).reverse().join(separator),
                                    value: json.highlighting[doc.id][field][0] //take first highlight
                                };
                            });
                        }
                    }
                });
                terms.initialize();
                $input.typeahead(
                    {
                        highlight: false,
                        hint: true,
                        classNames: {
                            input: 'kmaps-tt-input',
                            hint: 'kmaps-tt-hint',
                            menu: 'kmaps-tt-menu',
                            dataset: 'kmaps-tt-dataset',
                            suggestion: 'kmaps-tt-suggestion',
                            empty: 'kmaps-tt-empty',
                            open: 'kmaps-tt-open',
                            cursor: 'kmaps-tt-cursor',
                            highlight: 'kmaps-tt-highlight'
                        }
                    },
                    {
                        name: domain,
                        limit: 999,
                        display: 'value',
                        source: terms,
                        templates: {
                            suggestion: function (data) {
                                return '<div><span class="kmaps-term">' + data.value + '</span> ' +
                                    '<span class="kmaps-ancestors">' + data.anstring + '</span></div>';
                            }
                        }
                    }
                );
            });
        }
    }
})
(jQuery);