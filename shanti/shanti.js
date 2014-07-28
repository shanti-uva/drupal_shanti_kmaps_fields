Ext.onReady(function () {
    var p = new Ext.Panel({
        title: 'Lookup Field Test 2',
        frame: true,
        collapsible: true,
        renderTo: 'shanti_field_id_wrapper',
        width: 400,
        height: 120,
        items: [
            {
                xtype: 'button',
                text: 'Lookup KMap Subject',
                handler: function () {
                    new SharedShelf.lookup.KmapsSubjects().prompt(function () {
                        var linkData = '<a href="http://subjects.kmaps.virginia.edu/features/' +
                            arguments[1] + '" target="_blank" >' + arguments[2] + '</a>';
                        jQuery('#shanti_field_id_wrapper input[type=text]').val(linkData);
                    }, {});
                }
            },
            {
                xtype: 'button',
                text: 'Lookup KMap Place',
                handler: function () {
                    new SharedShelf.lookup.KmapsPlaces().prompt(function () {
                        var linkData = '<a href="http://places.kmaps.virginia.edu/features/' +
                            arguments[1] + '" target="_blank" >' + arguments[2] + '</a>';
                        jQuery('#shanti_field_id_wrapper input[type=text]').val(linkData);
                 }, {});
                }
            }
        ]
    });
});