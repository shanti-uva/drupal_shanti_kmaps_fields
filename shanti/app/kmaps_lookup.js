Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.SubjectLoader = Ext.extend(Ext.ux.tree.XmlTreeLoader, {
    processAttributes: function (attrs) {
        'use strict';
        if (attrs.tagName === 'feature' || attrs.tagName === 'category') {
            attrs.text = attrs.title;
            attrs.loaded = true;
            attrs.expanded = false;
            if (!attrs.childCount || attrs.childCount === 0) {
                attrs.isLeaf = true;
            }
        }
    },
    listeners: {
        beforeload: function () {
            Ext.getCmp("details").collapse();
            Ext.getCmp("details").hide();
            Ext.getCmp('kmapTree').body.mask("loading...");
        },
        load: function (tree, node, response) {
            'use strict';
            Ext.getCmp('kmapTree').body.unmask();
            node.text = "Knowledge Map Tree";
            node.expand();
        },
        loadexception: function (loader, node, response) {
            console.log("loadexception: " + node.title);
            var msg = "";
            var url = "unknown";
            if (loader) {
                url = loader.dataUrl;
            }
            if (response) {
                if (response.isTimeout) {
                    msg = "Timeout contacting kmaps server.<br/><br/>" + url;
                } else if (response.status !== 200) {
                    msg = "Server Error: " + response.status + " " + response.statusText + "<br/><br/>" + url;
                }
                if (msg === "") {
                    msg = "unknown error";
                }
                Ext.getCmp('kmapTree').body.unmask();

                // This is here because we seem to be getting continual
                // load exceptions even though the tree is loading fine.
                // So we check and move on if the response is a 200.
                if (response.status !== 200) {
                    Ext.Msg.show({
                        title: 'Error',
                        msg: msg,
                        buttons: { ok: "Retry", cancel: "Cancel" },
                        fn: function (blurt) {
                            // Ext.MessageBox.alert("pogo", blurt);
                            if (blurt === 'ok') {
                                Ext.getCmp('kmapTree').reload();
                            } else {
                                Ext.getCmp('lookup').close();
                            }
                        },
                        icon: Ext.MessageBox.ERROR
                    });
                } else {
                    console.log("Hmmm.  loadexception called but things look ok....?");
                    console.log(response.statusText);
                    Ext.getCmp('details').hide();
                }

            }
        }
    }

});

SharedShelf.lookup.Kmaps = Ext.extend(SharedShelf.lookup.ExternalServiceWindow, {

    handleChosen: function (chosenNode, action) {
        this.makeLink({ termId: chosenNode.id, term: chosenNode.text, variantTerms: [chosenNode.text], rawObject: {preferredTerm: chosenNode.text}}, action);
        this.close();
    },

    buildInterface: function () {
        Ext.apply(Ext.QuickTips.getQuickTip(), {
            maxWidth: 200,
            minWidth: 500,
            showDelay: 10,
            trackMouse: false,
            anchor: 'l'
        });

        Ext.QuickTips.init();

        return [
            {
                itemId: 'resultsPage',
                id: 'resultsPage',
                xtype: 'panel',
                layout: 'border',
                defaults: {
                    layout: 'fit'
                },
                border: false,
                frame: false,
                height: 300,
                bodyStyle: {
                    'background': "white"
                },
                items: [
                    {
                        itemId: 'searchForm',
                        id: 'searchForm',
                        xtype: 'form',
                        border: false,
                        height: 70,
                        padding: 20,
                        region: 'north',
                        lookup: this,
                        items: [
                            {
                                xtype: 'compositefield',
                                fieldLabel: 'Filter',
                                items: [
                                    {
                                        id: 'searchText',
                                        xtype: 'clearable-textfield',
                                        itemId: 'searchText',
                                        name: 'term',
//                                        store: this.externalServiceStore,
                                        emptyText: 'Enter Search Term',
                                        width: 300,
                                        enableKeyEvents: true,
                                        listeners: {
                                            specialkey: {
                                                fn: function (t, e) {
                                                    switch (e.getKey()) {
                                                        case e.TAB:
                                                        case e.ENTER:
                                                        case e.DOWN:
                                                        case e.UP:
                                                        case e.RIGHT:
                                                        case e.LEFT:
                                                            var tree = Ext.getCmp('kmapTree');
                                                            tree.updateUI();
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                            },
                                            keydown: {
                                                fn: function (filterTxt, e) {
                                                    var length = filterTxt.getValue().length;
                                                    if (length > 1 || length === 0) {
                                                        Ext.getCmp('kmapTree').updateUI();
                                                    }
                                                },
                                                buffer: 1000
                                            },
                                            scope: this
                                        }
                                    },
                                    {
                                        'id': 'help',
                                        'xtype': 'button',
                                        'text': 'help',
                                        'enableToggle': true,
                                        'padding': 50,
                                        'toggleHandler': function () {
                                            if (this.pressed) {
                                                Ext.getCmp('helpPopup').show();
                                            } else {
                                                Ext.getCmp('helpPopup').hide();
                                            }
                                        }
                                    }
                                ]
                            },
                            {
                                xtype: "compositefield",
                                items: [
                                    {
                                        "id": "countTxt",
                                        "xtype": 'displayfield',
                                        "value": "Showing All " + this.rootName,
                                        height: 32,
                                        width: 300,
                                        padding: 12
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        id: 'details',
                        xtype: 'panel',
                        itemId: 'details',
                        name: 'details',
                        title: 'Details',
                        width: '200',
                        region: 'east',
                        layout: 'fit',
                        hidden: false,
                        isCollapsed: false,
                        frame: true,
                        padding: 5,
                        cmargins: 20,
                        fbar: [

                            {
                                text: 'Choose',
                                menu: [
                                    {
                                        text: 'Link',
                                        itemId: 'linkOnly',
                                        handler: function (x, y) {
                                            var sel = Ext.getCmp('kmapTree').getSelectionModel().getSelectedNode();
                                            this.handleChosen(sel, 'link');
                                        },
                                        scope: this
                                    },
                                    {
                                        text: 'Append',
                                        itemId: 'linkAndAppend',
                                        handler: function (x, y) {
                                            var sel = Ext.getCmp('kmapTree').getSelectionModel().getSelectedNode();
                                            this.handleChosen(sel, 'append');
                                        },
                                        scope: this
                                    },
                                    {
                                        text: 'Overwrite',
                                        itemId: 'linkAndOverwrite',
                                        handler: function (x, y) {
                                            var sel = Ext.getCmp('kmapTree').getSelectionModel().getSelectedNode();
                                            this.handleChosen(sel, 'overwrite');
                                        },
                                        scope: this
                                    }
                                ]
                            },
                            {
                                text: 'Cancel',
                                itemId: 'cancel',
                                handler: function () {
                                    Ext.getCmp('kmapTree').clearDetails();
                                }
                            }


                        ]
                    }
                    ,
                    {
                        id: 'kmapTree',
                        itemId: 'kmapTree',
                        region: 'center',
                        xtype: 'treepanel',
                        title: "Knowledge Maps " + this.rootName,
                        height: 200,
                        useArrows: true,
                        autoScroll: true,
                        animate: true,
                        enableDD: false,
                        containerScroll: true,
                        rootVisible: true,
                        renderHidden: false,
                        forceLayout: true,
                        layout: 'fit',
                        buttonAlign: 'left',
                        lookup: this,
                        root: {
                            nodeType: 'async',
                            hidden: true
                        },
//                        header: {
//                            titlePosition: 0,
////                            items: [{
////                                xtype: 'button',
////                                text: 'Edit',
////                                handler: function () {
////                                    alert('button clicked!');
////                                }
////                            }]
//                        },

                        loader: new SharedShelf.lookup.SubjectLoader({
                            loadChildren: true,
                            dataUrl: this.dataUrl
                        }),
                        listeners: {
                            'afterrender': function (tp) {

                                Ext.create(
                                    {
                                        id: 'helpPopup',
                                        xtype: 'tooltip',
                                        target: 'help',
                                        anchor: 'top',
                                        html: '<h1>Search</h1>' +
                                            'Start typing in the search field, to narrow down items in the tree.<br/><br/>' +
                                            '<h1>Expanding the tree</h1>' +
                                            'Click on the <span style="width: 18px; height: 18px; overflow: hidden;"><img src="resources/images/kmaps/tree/sprites.png"/></span> to the left of an item to expand and collapse the tree.<br/><br/>' +
                                            '<h1>Showing non-matching items</h1>' +
                                            '<dd>Click on the (+) or (-) to the right of an item to see ALL the nested items.<br/><br/>',
                                        autoHide: false,
                                        closable: true,
                                        listeners: {
                                            'hide': function () {
                                                Ext.getCmp('help').toggle(false);
                                            }

                                        }
                                    }
                                );

                                //                             alert(tp);
                                tp.getSelectionModel().on('selectionchange', function (tree, node) {

                                    // display template
                                    var tmpl = new Ext.XTemplate(
                                        '<h1>{text}</h1>',
                                        //    '<p>{id}</p>',
                                        '<p><em>Here is where summary data would be.</em></p>',
                                        '<tpl if="values.childNodes.length === 1">',
                                        '<b>item has {[values.childNodes.length]} child</b>',
                                        '</tpl>',
                                        '<tpl if="values.childNodes.length &gt; 1">',
                                        '<b>item has {[values.childNodes.length]} children</b>',
                                        '</tpl>'
//                                        ,
//                                        '<tpl if="values.childNodes.length === 0">',
//                                        '<b>Leaf Node</b>',
//                                        '</tpl>'

                                    ).compile();
                                    var ct = Ext.getCmp('details'); //
                                    ct.update(tmpl.apply(node));
                                    ct.show();
                                    ct.expand();
                                });

                                tp.on('expandnode', function (node) {

                                    if (node.allHidden) {

                                        delete node.allHidden;
                                        node.filterTree(Ext.getCmp('searchText').getValue(), false, true);
                                        node.expand(false);
//                                        var xlessElemTip = Ext.getCmp('x-less-' + node.id + 'tip');
//                                        if (xlessElemTip) {
//                                            xlessElemTip.show();
//                                        }

                                    }

                                    // decorate those nodes which might not have been rendered yet
                                    var searchtxt = Ext.getCmp('searchText').getValue();
                                    var regex = new RegExp("(" + Ext.escapeRe(searchtxt) + ")", "gi");
                                    if (node.hasChildNodes()) {
                                        Ext.each(node.childNodes,
                                            function () {
                                                SharedShelf.UVa.lookup.Util.decorateNode(this, regex);
                                            }
                                        );
                                    }
                                });


                                // do this if you want to alter doubleclick behavior...
                                tp.on('beforedblclick', function (node, evt) {
                                        // alert("double click!");
                                        if (node.hasChildNodes()) {
                                            Ext.getCmp("kmapTree").changeRoot(node.id);
//                                            Ext.getCmp('kmapTree').collapseAll();
                                            evt.stopPropagation();
                                        }
                                        return false;
                                    }
                                );

                                // let's re-set everything once...
                                this.getRootNode().expand();

                            },
                            'contextmenu': this.linkMenuForRecord,
                            'beforecollapsenode': function (node) {
                                return (node.id !== this.getRootNode().id);
                            },
                            'load': function () {
                                this.getRootNode().beginUpdate();
                                this.getRootNode().setText(this.rootName);
                                this.getRootNode().setCls('root-node');
                                this.getRootNode().endUpdate();
                                this.masterRootNode = this.getRootNode().clone();
                            }

//                           , 'mouseover': {
//                                fn: function() { alert('burp!');},
//                                delegate: 'a.x-show-more'
//                            }
                        },

                        onToggleShow: function (x, y) {
                            this.updateUI();
                        },
                        updateUI: function () {
//                            console.log("updateUI called");
                            var filterTxt = Ext.getCmp('searchText').getValue();
                            // var showOnlyMatches = Ext.getCmp('showOnlyMatches').pressed;
                            var showOnlyMatches = true;
//                            console.log("filtering: " + filterTxt);
//                            console.log("showOnlyMatches: " + showOnlyMatches);
//                            this.expandAll();
//                            this.collapseAll();
                            var that = this;
                            setTimeout(function () {
                                var counts = that.getRootNode().filterTree(filterTxt, showOnlyMatches);
                                var isPlural = (counts.matches > 1 || counts.matches === 0);
                                if (counts.matches === counts.total || !filterTxt) {
                                    Ext.getCmp('countTxt').setValue("Showing All " + counts.total + " " + that.rootName);
                                } else {
                                    Ext.getCmp('countTxt').setValue(counts.matches + " match" + (isPlural ? "es" : "") + " out of " + counts.total + " total " + that.rootName + ".");
                                }
                                if (counts.matches === 0 && counts.total > 0 && showOnlyMatches && filterTxt) {
                                    var within = (that.getRootNode().id === that.masterRootNode.id) ? "" : " within topic <b>" + that.getRootNode().text + "</b>";
                                    SharedShelf.UVa.lookup.Util.msg("No Matches", "There are no matches to your query" + within + ".<br/>Showing all non-matches.");
                                    Ext.getCmp('kmapTree').getRootNode().filterTree(filterTxt, false);
                                }
                                Ext.getCmp('resultsPage').doLayout();
                                Ext.getCmp('kmapTree').render();
                                that.getRootNode().expand();
                            }, 1);
                        },

                        reload: function () {
                            this.enable();
                            this.getLoader().load(this.root);
                        },
                        clearDetails: function () {
                            Ext.getCmp('details').update('');
                            Ext.getCmp('details').collapse();
                            Ext.getCmp('details').hide();
                            Ext.getCmp('resultsPage').doLayout();
                            return this;
                        },
                        changeRoot: function (id) {
//                            Ext.getCmp("kmapTree").getEl().fadeOut();
                            var grokPath = function (n) {
                                if (n === null) {
                                    return "Knowledge Map Terms";
                                }
                                var path = [ ];
                                var focustext = n.text;
                                path.unshift(focustext);
                                while (n.parentNode) {
                                    n = n.parentNode;
//                                    console.log("adding: " + n.text + "(" + n.id + ")");
                                    if (n.text) {
                                        path.unshift("<a href='javascript: Ext.getCmp(&apos;kmapTree&apos;).changeRoot(&apos;" + n.id + "&apos;)'>" + n.text + "</a>");
                                    }
                                }
//                                path.unshift("<a href='javascript: Ext.getCmp(&apos;kmapTree&apos;).changeRoot(0)'>Root</a>");
                                return "<em>" + path.join('/') + "</em>";
                            };

                            var newroot;
                            // console.log("changeRoot: finding id=" + id);
                            newroot = this.masterRootNode.findChild('id', id, true);
                            if (newroot === null) {
                                newroot = this.masterRootNode.clone();
                                this.setTitle("Knowledge Maps " + this.rootName);
                            } else {
                                this.setTitle(grokPath(newroot));
                                newroot.renderMoreLink(newroot);
                            }
                            if (newroot) {
                                this.getRootNode().setCls('');
                                this.clearDetails();
                                var clone = newroot.clone();
                                this.setRootNode(clone);
                                this.getRootNode().setCls('root-node');
                            } else {
                                alert("no newroot!");
                                // nothing doing!
                            }
                            this.updateUI();
                        },
                        masterRootNode: {
                        },
                        rootName: this.rootName
                    }
                ]

            }
        ];
    },

    buildStore: function () {
        // this is a stub to keep SharedShelf.lookup.ExternalServiceWindow happy
        'use strict';
        return {
            'xtype': 'ss-abortable-store',
            root: 'boot',
            totalProperty: 'totallyproper',
            restful: true,
            baseParams: {format: 'json'}
        };
    },

    linkMenuForRecord: function (node, e) {

        e.preventDefault();

        var ctxMenuChoices = [
            {
                text: 'Focus',
                handler: function (t, e, x, y, z) {
                    // var clone = node.clone();
                    var km = Ext.getCmp('kmapTree');
                    km.changeRoot(node.id);
                },
                scope: this
            },
            {

                text: 'Show All',
                handler: function (c) {
//                    alert(node.text + ":" + node.id + ":" + node.hasChildNodes());
                    if (node.hasChildNodes()) {
                        node.collapse(true);
                        node.expand();
                        node.filterTree(Ext.getCmp('searchText').getValue(), false);
                    }
                },
                scope: this
            },
            {

                text: 'Choose',
                menu: [
                    {
                        text: "Link",
                        handler: function (c) {
                            this.lookup.handleChosen(node, 'link');
                        },
                        scope: this
                    },
                    {
                        text: 'Append',
                        handler: function (x, y) {
                            this.lookup.handleChosen(node, 'append');
                        },
                        scope: this
                    },
                    {
                        text: 'Overwrite',
                        handler: function (x, y) {
                            this.lookup.handleChosen(node, 'overwrite');
                        },
                        scope: this
                    }

                ]

            }
        ];

        var opts = [];
        if (node.hasChildNodes()) {
            opts = ctxMenuChoices.slice(0, 3);
        } else {
            opts = ctxMenuChoices.slice(2, 3);
        }
        var ctxMenu = new Ext.menu.Menu({
            items: opts
        });
        ctxMenu.showAt(e.getPoint());

    }
})
;


SharedShelf.lookup.KmapsSubjects = Ext.extend(SharedShelf.lookup.Kmaps, {
    id: 'lookup',
    title: 'UVa Knowledge Maps',
    source: 'UVA-KM-S',
    rootName: 'Subjects',
    registeredExtJSType: 'x-imata-external-kmaps-subject-lookup',
    displayMode: 'browse',
    height: 400,
//    dataUrl: 'http://localhost/subjects/categories.xml'
//    dataUrl: 'http://localhost/externallookup/out.xml'
    dataUrl: 'http://subjects.kmaps.virginia.edu/features/nested.xml'
//    dataUrl: 'http://places.kmaps.virginia.edu/features/nested.xml',
});
Ext.reg('x-imata-external-kmaps-subject-lookup', SharedShelf.lookup.KmapsSubjects);

/*Imata.form.LinkedTextField.registerRenderer('UVA-KM-S', function(link) {
  return String.format('{0}<br/><span class="linked-info"/> {1} ID {2}</span>',
      link.data.preferredTerm, link.source, link.source_id);
});*/

SharedShelf.lookup.KmapsPlaces = Ext.extend(SharedShelf.lookup.Kmaps, {
    id: 'lookup',
    title: 'UVa Knowledge Maps',
    source: 'UVA-KM-P',
    rootName: 'Places',
    registeredExtJSType: 'x-imata-external-kmaps-place-lookup',
    displayMode: 'browse',
    height: 400,
//    dataUrl: 'http://localhost/subjects/categories.xml'
//    dataUrl: 'http://localhost/externallookup/out.xml',
//    dataUrl: 'http://subjects.kmaps.virginia.edu/features/nested.xml'
    dataUrl: 'http://places.kmaps.virginia.edu/features/nested.xml'


});

Ext.reg('x-imata-external-kmaps-place-lookup', SharedShelf.lookup.KmapsPlaces);



/*Imata.form.LinkedTextField.registerRenderer('UVA-KM-P', function(link) {
  return String.format('{0}<br/><span class="linked-info"/> {1} ID {2}</span>',
      link.data.preferredTerm, link.source, link.source_id);
});*/



Ext.override(Ext.tree.TreeNode, {
    clone: function () {
        var clone;
        var atts = this.attributes;
        if (this.childrenRendered || this.loaded || !this.attributes.children) {
            clone = new Ext.tree.TreeNode(Ext.apply({}, atts));
            if (!clone.ui) {
                var uiClass = clone.attributes.uiProvider || clone.defaultUI || Ext.tree.TreeNodeUI;
                clone.ui = new uiClass(this);
            }
        }
        else {
            var newAtts = Ext.apply({}, atts);
            newAtts.children = this.cloneUnrenderedChildren();
            clone = new Ext.tree.AsyncTreeNode(newAtts);
        }
        clone.text = this.text;

        for (var i = 0; i < this.childNodes.length; i++) {
            clone.appendChild(this.childNodes[i].clone());
        }
        return clone;
    },

    cloneUnrenderedChildren: function () {

        unrenderedClone = function (n) {
            //n.id = undefined;
            if (n.children) {
                for (var j = 0; j < n.children.length; j++) {
                    n.children[j] = unrenderedClone(n.children[j]);
                }
            }
            return n;
        };

        var c = [];
        for (var i = 0; i < this.attributes.children.length; i++) {
            c[i] = Ext.apply({}, this.attributes.children[i]);
            c[i] = unrenderedClone(c[i]);
        }
        return c;
    },
    filterTree: function (t, showOnlyMatches, alwaysShowRoot) {
        'use strict';

        var recurse_tree = function (nodule, countMatches, showRoot) {
//            console.log("recurse: " + nodule.text);
            var regex = SharedShelf.UVa.lookup.Util.createRegex(t);
            var matchCount = { total: 0, matches: 0};

            if (regex.blankRegex) {
                showOnlyMatches = false;
            }

            if (countMatches) {
                matchCount.total++;
            }

            if (SharedShelf.UVa.lookup.Util.decorateNode(nodule, regex)) {
                if (countMatches) {
                    matchCount.matches++;
                }
            }

            var childMatchCount = {matches: 0, total: 0};
            var shallowCount = {matches: 0, total: 0};
            Ext.each(nodule.childNodes, function () {
                var ccount = recurse_tree(this, true, false);
                childMatchCount.matches += ccount.matches;
                childMatchCount.total += ccount.total;
                shallowCount.total++;
                if (regex.test(this.text)) {
                    shallowCount.matches++;
                }
            });

            nodule.childMatches = shallowCount.matches;
            nodule.childCount = shallowCount.total;

            if (!showOnlyMatches) {
                if (nodule.childMatches !== nodule.childCount && !regex.blankRegex) {
                    nodule.showingHidden = true;
                }
                else {
                    nodule.showingHidden = false;
                }
            } else {
                nodule.showingHidden = false;
                if (childMatchCount.matches === 0 && !regex.blankRegex) {
                    nodule.allHidden = true;
                }
            }

            matchCount.matches += childMatchCount.matches;
            matchCount.total += childMatchCount.total;

            // hide or show this node!
            if (showOnlyMatches && !showRoot && matchCount.matches === 0) {
                nodule.ui.hide();
            } else {
                nodule.ui.show();
                if (matchCount.matches === 0 && matchCount.total > 1) {
//                    console.log("   collapsing node: " + nodule.text);
                    nodule.collapse();
//                    console.log("   collapsing node: done");
                }
            }

            // expand those paths that have immediate child matches.
            if (nodule.childMatches > 0) {
//                console.log("  expanding path: " + nodule.getPath());
                try {
                    nodule.getOwnerTree().expandPath(nodule.getPath());
                } catch (e) {
                    console.log("exception while expanding: " + e);
                }
            }
            return matchCount;
        };

        var busy = SharedShelf.UVa.lookup.Util.busy();
        var cnt = recurse_tree(this, false, alwaysShowRoot);
        this.cascade(this.renderMoreLink);
        busy.cancel();
        return cnt;
    },
    renderMoreLink: function (node) {
        var hiddenCount = 0;
        var matchCount = 0;
        for (var i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].hidden) {
                hiddenCount++;
            }
            if (node.childNodes[i].match) {
                matchCount++;
            }
        }
        var xmoreElem = Ext.get('x-more-' + node.id);
        var xlessElem = Ext.get('x-less-' + node.id);

        //  TODO:  clean up this logic
        if (Ext.getCmp("searchText").getValue() === "") {
            if (xmoreElem) {
                xmoreElem.remove();
            }
            if (xlessElem) {
                xlessElem.remove();
            }
        } else {


            if (hiddenCount !== 0) {
                if (xlessElem) {
                    xlessElem.remove();
                }
                if (!xmoreElem) {
                    var moreLink = [
                        "<a ext:qtip='click to show all items' name='show all' class='x-show-hidden x-more-show-hidden' id='x-more-" + node.id + "'>",
                        "(+)",
                        "</a>"
                    ].join('');

                    if (node.ui.getTextEl() && node.ui.getTextEl().parentNode) {
                        Ext.DomHelper.insertAfter(node.ui.getTextEl().parentNode, moreLink, true);
                        xmoreElem = Ext.get('x-more-' + node.id);
                        if (xmoreElem) {
                            xmoreElem.on("click", function () {
//                            node.collapse(true);
                                node.filterTree(Ext.getCmp('searchText').getValue(), false, true);
                                node.expand(false);
                            });

//                            if (!Ext.getCmp('x-more-' + node.id + 'tip')) {
//                                Ext.create(
//                                    {
//                                        xtype: 'tooltip',
//                                        id: 'x-more-' + node.id + 'tip',
//                                        target: xmoreElem,
//                                        anchor: 'left',
//                                        html: 'Click to show non-matching items'
//                                    });
//
//                                if (Ext.getCmp('x-less-' + node.id + 'tip')) {
//                                    Ext.getCmp('x-less-' + node.id + 'tip').destroy();
//                                }
//                            }
                        }
                    } else {
                        // console.log("node " + node.text + " doesn't have a Text Element!");
                    }
                }
            }

            if (node.showingHidden) {
                if (xmoreElem) {
                    xmoreElem.remove();
                }
                if (!xlessElem) {
                    var lessLink = [
                        "<a name='hide non-matches' ext:qtip='click to show only matches' class='x-show-hidden x-less-show-hidden' id='x-less-" + node.id + "'>",
                        "(-)",
                        "</a>"
                    ].join('');

                    if (node.ui.getTextEl()) {
                        Ext.DomHelper.insertAfter(node.ui.getTextEl().parentNode, lessLink, true);
                        xlessElem = Ext.get('x-less-' + node.id);
                        if (xlessElem) {
                            xlessElem.on("click", function () {
                                node.filterTree(Ext.getCmp('searchText').getValue(), true, true);
                                // node.expand(false);
                            });

//                            if (!Ext.getCmp('x-less-' + node.id + 'tip')) {
//                                Ext.create(
//                                    {
//                                        xtype: 'tooltip',
//                                        target: xlessElem,
//                                        id: 'x-less-' + node.id + 'tip',
//                                        anchor: 'left',
//                                        html: 'Click to hide non-matching items'
//                                    });
//                                if (Ext.getCmp('x-more-' + node.id + 'tip')) {
//                                    Ext.getCmp('x-more-' + node.id + 'tip').destroy();
//                                }
//                            }
                        }
                    }
                }
            }

        }
    }
})
;

SharedShelf.lookup.ClearableTextField = Ext.extend(Ext.form.TriggerField, {
    'fieldLabel': 'Search',
    'triggerClass': 'x-form-clear-trigger',
    'overCls': 'x-form-trigger-mouseover',
    'emptyCls': 'x-form-trigger-empty',

    onTriggerClick: function (x, y) {
        Ext.getCmp('searchText').setValue('');
        Ext.getCmp('kmapTree').updateUI();
        Ext.getCmp('searchText').focus();
    }
});

Ext.reg('clearable-textfield', SharedShelf.lookup.ClearableTextField);


SharedShelf.UVa.lookup.Util = ( function () {

    // private
    var msgCt;
    var busyCt;

    function createBox(t, s) {
        return ['<div class="msg">',
            '<div class="x-box-tl"><div class="x-box-tr"><div class="x-box-tc"></div></div></div>',
            '<div class="x-box-ml"><div class="x-box-mr"><div class="x-box-mc"><h3>', t, '</h3>', s, '</div></div></div>',
            '<div class="x-box-bl"><div class="x-box-br"><div class="x-box-bc"></div></div></div>',
            '</div>'].join('');
    }


    return {
        msg: function (title, format) {

//            console.log("msg: " + title + " / " + format);

            if (!msgCt) {
                msgCt = Ext.DomHelper.insertFirst(Ext.get('kmapTree'), {id: 'msg-div'}, true);
            }
            msgCt.alignTo(Ext.getCmp('kmapTree').getEl(), 't-t', [0, 50]);
            var s = String.format.apply(String, Array.prototype.slice.call(arguments, 1));
            var m = Ext.DomHelper.append(msgCt, {html: createBox(title, s)}, true);
            m.slideIn('t');

            var cancelMe = function () {
                if (m.isVisible()) {
//                    console.log("ghosting away");
                    m.slideOut('t');
                    m.ghost("t", {remove: true});
                }
//                else {
//                    console.log("already a ghost");
//                }
            };

            var timer = new Ext.util.DelayedTask(cancelMe);
            timer.delay(5000);

            // attach listener to the msg box
            m.on('click', cancelMe);

            m.cancel = cancelMe;

            // attach a temporary listener to document that dismisses it on any click or keypress
            Ext.get(document).on({
                'click': {
                    fn: cancelMe,
                    single: true
                },
                'keypress': {
                    fn: cancelMe,
                    single: true
                }
            });

            // probably should attach the listener to the document...?
            return m;
        },

        busy: function () {//

//            console.log("showing busy");
            if (!busyCt) {
                busyCt = Ext.DomHelper.insertFirst(Ext.get('kmapTree'), {id: 'busy-div'}, true);
            }
            busyCt.alignTo(Ext.getCmp('kmapTree').getEl(), 't-t', [0, 50]);
            var s = {
                autoEl: {
                    tag: "img",
                    src: "../../images/ux/spinner.gif"
                }
            };
            var m = Ext.DomHelper.overwrite(busyCt, {html: createBox("", "<img src='../../images/ux/spinner.gif' />")}, true);
            m.fadeIn();

            var cancelMe = function () {
                if (m.isVisible()) {
//                    console.log("hiding busy");
                    m.fadeOut('fast', {remove: true});
                    m.ghost('t', {remove: true});
                }
            };

            m.cancel = cancelMe;
            var timer = new Ext.util.DelayedTask(cancelMe);
            timer.delay(10000);

            return m;
        },

//        done: function () {
//            Ext.getCmp('spinner').getEl().fadeOut();
//        },

        decorateNode: function (node, rx) {
//            console.log("decorating " + node.text + " with " + rx);
            if (rx.blankRegex) {
                if (node.ui) {
                    node.ui.removeClass("x-match");
                    node.ui.removeClass("x-nomatch");
                }
                if (node.match) {
                    // console.log("   clearing markup" + node.text);
                    if (node.ui && node.ui.getTextEl()) {
                        node.ui.getTextEl().innerHTML = node.text;
                    }
                }
                node.match = false;
                return false;
            }
            var match = rx.test(node.text);
            if (match) {
                node.match = true;
                if (node.ui) {
                    node.ui.addClass("x-match");
                    node.ui.removeClass("x-nomatch");
                }
                if (node.ui.getTextEl()) {
                    node.ui.getTextEl().innerHTML = node.text.replace(rx, "<b>$1</b>");
                }
            } else {
                node.match = false;
                if (node.ui) {
                    node.ui.addClass("x-nomatch");
                    node.ui.removeClass("x-match");
                }
            }

            return match;
        },

        createRegex: function (t) {
            return t !== '' ? (new RegExp("(" + Ext.escapeRe(t) + ")", "gi")) : ({
                blankRegex: true,
                test: function (x, y) {
                    return false;
                },
                toString: function () {
                    return "[blank regex]";
                }
            });
        }

    };
}()
    );



