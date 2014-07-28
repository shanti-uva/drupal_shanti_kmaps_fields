/**
 * Created with PyCharm.
 * User: will
 * Date: 2/26/13
 * Time: 1:12 AM
 * To change this template use File | Settings | File Templates.
 */
Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.ProgressShowingTextField = Ext.extend(Ext.form.TextField, {
    initComponent: function (config) {
        Ext.apply(this,
            { progressBar: new Ext.ProgressBar({style: 'position: absolute;'}) },
            config);
        SharedShelf.lookup.ProgressShowingTextField.superclass.initComponent.call(this);
        this.mon(this.store, 'beforeload', this.showLoading, this);
        this.mon(this.store, 'load', this.endLoading, this);
        this.mon(this.store, 'exception', this.endLoading, this);
    },
    showLoading: function () {
        var el = this.getEl(), box = el.getBox();
        if (!this.progressBar.getEl()) {
            this.progressBar.updateBox(box);
            this.progressBar.applyToMarkup(el);
        } else {
            this.progressBar.show();
        }
        this.progressBar.wait({text: 'Searching for ' + this.getValue()});
        this.setDisabled(true);
    },
    endLoading: function () {
        this.progressBar.reset();
        this.progressBar.hide();
        this.setDisabled(false);
    }
});
Ext.reg('progressive-textfield', SharedShelf.lookup.ProgressShowingTextField);
