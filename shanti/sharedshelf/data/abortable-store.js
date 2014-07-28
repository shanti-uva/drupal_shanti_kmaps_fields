/**
 * Created with PyCharm.
 * User: will
 * Date: 2/26/13
 * Time: 1:14 AM
 * To change this template use File | Settings | File Templates.
 */
Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.AbortableStore = Ext.extend(Ext.data.Store, {
    abortLoad: function () {
        this.proxy.getConnection().abort();
        this.fireEvent('exception', this, 'aborted');
    }
});
Ext.reg('ss-abortable-store', SharedShelf.lookup.AbortableStore);
