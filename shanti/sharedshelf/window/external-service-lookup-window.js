/**
 * Created with PyCharm.
 * User: will
 * Date: 2/26/13
 * Time: 1:17 AM
 * To change this template use File | Settings | File Templates.
 */
Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.ExternalServiceWindow = Ext.extend(Ext.Window, {
    title: 'Consult External Vocabulary',
    width: 640,
    height: 480,
    modal: true,
    cls: 'x-vocabulary-window-lookup',
    activeItem: 0,
    layout: 'card',
    initComponent: function (config) {
        this.externalServiceStore = Ext.create(this.buildStore());
        this.items = this.buildInterface();
        SharedShelf.lookup.ExternalServiceWindow.superclass.initComponent.call(this);
        this.mon(this.externalServiceStore, 'load', this.onLoad, this);
    },

    buildStore: function () {
        throw('buildStore must be overridden');
    },
    buildInterface: function () {
        return [
            {
                itemId: 'resultsPage',
                xtype: 'panel',
                layout: 'border',
                border: false,
                frame: false,
                bodyStyle: {background: "white"},
                bbar: {
                    xtype: 'paging',
                    displayInfo: true,
                    store: this.externalServiceStore,
                    pageSize: 20,
                    bodyStyle: {background: "white"},
                    hidden: true
                },
                items: [
                    {
                        itemId: 'searchForm',
                        xtype: 'form',
                        border: false,
                        height: 50,
                        padding: 10,
                        region: 'north',
                        items: [
                            {
                                xtype: 'compositefield',
                                fieldLabel: 'Search',
                                items: [
                                    {
                                        xtype: 'progressive-textfield',
                                        itemId: 'searchText',
                                        name: 'term',
                                        store: this.externalServiceStore,
                                        emptyText: 'Enter Term',
                                        width: 400,
                                        enableKeyEvents: true,
                                        listeners: {
                                            keypress: function (tf, e) {
                                                if (e.getCharCode() == Ext.EventObject.ENTER) {
                                                    this.doSearch();
                                                }
                                            },
                                            scope: this
                                        }
                                    },
                                    {
                                        xtype: 'external-service-search-button',
                                        text: 'Search',
                                        store: this.externalServiceStore,
                                        handler: this.doSearch,
                                        scope: this
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        itemId: 'searchResults',
                        padding: 4,
                        region: 'center',
                        xtype: 'listview',
                        store: this.externalServiceStore,
                        hidden: true,
                        singleSelect: true,
                        emptyText: 'No matches found.',
                        listeners: {
                            contextMenu: this.linkMenuForRecord,
                            click: this.showRecord,
                            scope: this
                        },
                        columns: [
                            {
                                header: 'Term',
                                dataIndex: 'term',
                                tpl: this.getTermTemplate(), // '<b><a>{title}</a></b><br>Type: {type}<br>Source: {source}<div class="controls">',
                                width: .8
                            },
                            {
                                header: 'ID',
                                dataIndex: 'id'
                            }
                        ]
                    }
                ]
            },
            {
                itemId: 'termPage',
                xtype: 'panel',
                padding: 10,
                fbar: [
                    {text: 'Link Only', itemId: 'linkOnly'},
                    {text: 'Link & Append to Display', itemId: 'linkAndAppend'},
                    {text: 'Link & Overwrite Display', itemId: 'linkAndOverwrite'}
                ],
                tbar: [{text: 'Back to search results',
                    handler: function() { this.getLayout().setActiveItem(0); }, scope: this}]
            }
        ]
    },

    linkMenuForRecord: function (c, index, node, e) {
        e.preventDefault();
        c.select(index);
        var ctxMenu = new Ext.menu.Menu({items: [
            {text: 'Link Only', handler: function() {var r = c.getSelectedRecords(); this.linkOnly(r[0])}, scope: this},
            {text: 'Link & Append to Display', handler: function() {var r = c.getSelectedRecords(); this.linkAndAppend(r[0])}, scope: this},
            {text: 'Link & Overwrite Display', handler: function() {var r = c.getSelectedRecords(); this.linkAndOverwrite(r[0])}, scope: this}
        ]});
        ctxMenu.showAt(e.getPoint());
    },

    showRecord: function (c, index, node, e) {
        var record = c.store.getAt(index);
        this.retrieveRecord(record.data, this.displayRecord.createDelegate(this));
    },

    displayRecord: function(data) {
        this.getLayout().setActiveItem(1);
        var termPage = this.getComponent('termPage');
        termPage.update(new Ext.XTemplate(this.getDisplayTemplate()).apply(data));
        termPage.fbar.getComponent('linkOnly').setHandler(this.linkOnly.createDelegate(this, [data]));
        termPage.fbar.getComponent('linkAndAppend').setHandler(this.linkAndAppend.createDelegate(this, [data]));
        termPage.fbar.getComponent('linkAndOverwrite').setHandler(this.linkAndOverwrite.createDelegate(this, [data]));
    },

    getTermTemplate: function () {
        throw("getTermTemplate must be overridden");
    },

    getDisplayTemplate: function() {
        throw("getDisplayTemplate must be overridden");
    },

    retrieveRecord: function (record, callback) {
        throw("retrieveRecord must be overridden");
    },

    onLoad: function () {
        this.getComponent('resultsPage').getComponent('searchResults').show();
        this.getComponent('resultsPage').getBottomToolbar().show();
    },

    prompt: function (callback, config) {
        this.callback = callback;
        this.show();
    },

    doSearch: function() {
        var formValues = this.getComponent('resultsPage').getComponent('searchForm').getForm().getValues();
        this.searchExternalService(formValues);
    },

    searchExternalService: function (values) {
        throw("searchExternalService must be overridden");
    },

    linkAndOverwrite: function(record) {
        this.close();
        this.extractLinkData(record, this.makeLink.createDelegate(this, 'overwrite', 1));
    },
    linkAndAppend: function(record) {
        this.close();
        this.extractLinkData(record, this.makeLink.createDelegate(this, 'append', 1));
    },
    linkOnly: function(record) {
        this.close();
        this.extractLinkData(record, this.makeLink.createDelegate(this, 'link', 1));
    },
    // makeLink is the core function for integration with SharedShelf.  It must invoke the callback
    // provided during the prompt call and supply the following arguments:
    //
    //  1.  A unique identifier for the term.  (Usually source prepended to the term id)
    //  2.  The term identifier.
    //  3.  The term itself.
    //  4.  The source of the term  (This is not a descriptive field, use an abbreviation)
    //  5.  The ExtJS registered xtype of this component.
    //  6.  An array of variant terms.
    //  7.  A version number for the term.
    //  8.  A payload object.  (Will just be stored.)
    //  9.  The linking action.  ['link', 'append', 'overwrite']
    makeLink: function(linkData, action) {
        var xtype = this.registeredExtJSType ? this.registeredExtJSType : 'x-imata-unknown-external-lookup';
        if(linkData.termId && !Ext.isEmpty(linkData.termId)) {
            this.callback(this.source+'-'+linkData.termId, linkData.termId,
                linkData.term, this.source, xtype,
                linkData.variantTerms, -1, linkData.rawObject, action);
        } else {
            throw("linkData did not contain a termId");
        }
    },
    // extractLinkData provides an extension point to convert a record into the
    // correct form for linking.
    //
    // Linking requires the following attributes:
    //
    // termId - The term identifier.
    // term - The textual term itself.
    // variantTerms - An array of variant terms.
    // rawObject - A black box object to pass thru.  (Optional)
    extractLinkData: function(record, callback) {
        throw("extractLinkData must be overridden");
    }
});
