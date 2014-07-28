/**
 * Created with PyCharm.
 * User: will
 * Date: 2/26/13
 * Time: 1:15 AM
 * To change this template use File | Settings | File Templates.
 */

Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.ExternalServiceSearchButton = Ext.extend(Ext.Button, {
    initComponent: function (config) {
        this.storeLoading = false;
        Ext.apply(this, {cancelText: 'Cancel'}, config);
        SharedShelf.lookup.ExternalServiceSearchButton.superclass.initComponent.call(this);
        this.mon(this.store, 'beforeload', this.showWhileLoading, this);
        this.mon(this.store, 'load', this.endLoading, this);
        this.mon(this.store, 'exception', this.endLoading, this);
    },
    showWhileLoading: function () {
        this.storeLoading = true;
        this.searchText = this.getText();
        this.setText(this.cancelText);
    },
    endLoading: function () {
        this.storeLoading = false;
        this.setText(this.searchText);
    },
    onClick: function (e) {
        if (this.storeLoading) {
            e.preventDefault();
            this.store.abortLoad();
        } else {
            SharedShelf.lookup.ExternalServiceSearchButton.superclass.onClick.call(this, e);
        }
    }
});
Ext.reg('external-service-search-button', SharedShelf.lookup.ExternalServiceSearchButton);
