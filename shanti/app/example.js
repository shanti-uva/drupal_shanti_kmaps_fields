/**
 * Created with PyCharm.
 * User: will
 * Date: 2/14/13
 * Time: 4:29 PM
 * To change this template use File | Settings | File Templates.
 */

Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.LoCDataReader = function (meta, recordType) {
    meta = meta || {};
    /**
     * @cfg {String} idProperty [id] Name of the property within a row object
     * that contains a record identifier value.  Defaults to <tt>id</tt>
     */
    /**
     * @cfg {String} successProperty [success] Name of the property from which to
     * retrieve the success attribute. Defaults to <tt>success</tt>.  See
     * {@link Ext.data.DataProxy}.{@link Ext.data.DataProxy#exception exception}
     * for additional information.
     */
    /**
     * @cfg {String} totalProperty [total] Name of the property from which to
     * retrieve the total number of records in the dataset. This is only needed
     * if the whole dataset is not passed in one go, but is being paged from
     * the remote server.  Defaults to <tt>total</tt>.
     */
    /**
     * @cfg {String} root [undefined] <b>Required</b>.  The name of the property
     * which contains the Array of row objects.  Defaults to <tt>undefined</tt>.
     * An exception will be thrown if the root property is undefined. The data
     * packet value for this property should be an empty array to clear the data
     * or show no data.
     */
    Ext.applyIf(meta, {
        idProperty: 'id',
        successProperty: 'success',
        totalProperty: 'total'
    });

    SharedShelf.lookup.LoCDataReader.superclass.constructor.call(this, meta, recordType || meta.fields);
};

Ext.extend(SharedShelf.lookup.LoCDataReader, Ext.data.JsonReader, {
    readRecords: function (raw) {
        var total = raw.locsh.filter(function (e) {
            return e[0] == 'opensearch:totalResults'
        })[0][2];
        var entries = raw.locsh.filter(function (e) {
            return e[0] == 'atom:entry'
        }, 'atom:entry');
        try {
            var s = { success: raw.success, totalRecords: total, records: this.extractData(this.parseLoCData(entries), true)};
        } catch (e) {
            console.log(e);
        }
        return s;
    },
    parseLoCData: function (data) {
        var entry, composite_id, parts, entries = [];
        for (var i = 0; i < data.length; i++) {
            entry = {};
            entry.term = data[i].filter(function (e) {
                return e[0] == 'atom:title'
            })[0][2];
            entry.link = data[i].filter(function (e) {
                return e[0] == 'atom:link' && e[1].type == 'application/json'
            })[0][1].href;
            composite_id = data[i].filter(function (e) {
                return e[0] == 'atom:id'
            })[0][2];
            entry.source = data[i].filter(function (e) {
                return e[0] == 'atom:author'
            })[0][2][2];
            parts = composite_id.split("/");
            entry.id = parts[parts.length - 1];
            entry.type = parts[2];
            entries.push(entry);
        }
        return entries;
    }
});

SharedShelf.lookup.LoCSubjectHeadings = Ext.extend(SharedShelf.lookup.ExternalServiceWindow, {
    title: 'Consult Library of Congress',
    buildStore: function () {
        return {'xtype': 'ss-abortable-store', root: 'entries', totalProperty: 'total',
            restful: true, baseParams: {format: 'json'},
            reader: new SharedShelf.lookup.LoCDataReader({fields: ['id', 'term', 'link', 'source', 'type']}),
            url: '/locsh/http://id.loc.gov/search/'}
    },

    getTermTemplate: function() {
        return '<b><a>{term}</a></b><br>Type: {type}<br>Source: {source}';
    },

    getDisplayTemplate: function() {
        return '<b>{term}</b><br><br>' +
            '<b>Variant Terms</b><br>' +
            '<tpl for="variantTerms">' +
                '{.}<br>' +
            '</tpl>' +
            '<br><br><b>Broader Terms</b><br>' +
            '<tpl for="broaderTerms">' +
                '{term}<br>' +
            '</tpl>' +
            '<br><br><b>Sources</b><br>' +
            '<tpl for="sources">' +
                '{.}<br>' +
            '</tpl>'
    },

    searchExternalService: function () {
        var form = this.getComponent('resultsPage').getComponent('searchForm').getForm().getValues();
        this.externalServiceStore.setBaseParam('q', form.term);
        this.externalServiceStore.load();
    },

    retrieveRecord: function(record, callback) {
        Ext.Ajax.request({
            url: '/locsh/http://id.loc.gov/authorities/subjects/' + record.id + '.rdf',
            success: function(resp, data, options) {
                var LoCSHObj = {variantTerms: [], sources: [], broaderTerms: [], narrowerTerms: []}, doc, variants, sources;
                doc = resp.responseXML;
                LoCSHObj.term = doc.getElementsByTagName("madsrdf:authoritativeLabel")[0].childNodes[0].nodeValue;
                variants = doc.getElementsByTagName("madsrdf:hasVariant");
                for(var i=0; i < variants.length; i++) {
                    LoCSHObj.variantTerms.push(variants[i].getElementsByTagName("madsrdf:variantLabel")[0].childNodes[0].nodeValue);
                }
                sources = doc.getElementsByTagName("madsrdf:Source");
                for(i=0; i < sources.length; i++) {
                    var sourceStr = sources[i].getElementsByTagName("madsrdf:citation-status")[0].childNodes[0].nodeValue;
                    sourceStr += ": " + sources[i].getElementsByTagName("madsrdf:citation-source")[0].childNodes[0].nodeValue;
                    if(sources[i].getElementsByTagName("madsrdf:citation-note").length > 0) {
                        sourceStr += " " + sources[i].getElementsByTagName("madsrdf:citation-note")[0].childNodes[0].nodeValue;
                    }
                    LoCSHObj.sources.push(sourceStr);
                }
                if(doc.getElementsByTagName("madsrdf:hasBroaderAuthority").length > 0) {
                    var broaderAuthorities = doc.getElementsByTagName("madsrdf:hasBroaderAuthority");
                    for(i=0; i < broaderAuthorities.length; i++) {
                        var bt = {
                            term: broaderAuthorities[i].getElementsByTagName("madsrdf:authoritativeLabel")[0].childNodes[0].nodeValue,
                            id: broaderAuthorities[i].getElementsByTagName("madsrdf:Topic")[0].getAttributeNode('rdf:about').nodeValue
                        };
                        LoCSHObj.broaderTerms.push(bt);
                    }
                }
                callback.call(this, LoCSHObj);
            },
            scope: this
        });
    },

    returnLinkOverwrite: function() {
      var d = this.getTermInformation();
      this.close();
      if(d.term_id && !Ext.isEmpty(d.term_id)) {
        this.callback(this.source+'-'+this.generatePseudoRandomId(), d.term_id, d.term, this.source, 'x-imata-external-raw-lookup', [], -1, {preferredTerm: d.term}, 'overwrite');
      }
    },
    returnLinkAppend: function() {
      var d = this.getTermInformation();
      this.close();
      if(d.term_id && !Ext.isEmpty(d.term_id)) {
        this.callback(this.source+'-'+this.generatePseudoRandomId(), d.term_id, d.term, this.source, 'x-imata-external-raw-lookup', [], -1, {preferredTerm: d.term}, 'append');
      }
    },
    returnLink: function() {
      var d = this.getTermInformation();
      this.close();
      if(d.term_id && !Ext.isEmpty(d.term_id)) {
        this.callback(this.source+'-'+this.generatePseudoRandomId(), d.term_id, d.term, this.source, 'x-imata-external-raw-lookup', [], -1, {preferredTerm: d.term}, 'link');
      }
    },


});
