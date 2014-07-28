Ext.ns('SharedShelf.lookup');

SharedShelf.lookup.LoCDataReader = function (meta, recordType) {
    meta = meta || {};
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
    source: 'LoCSH',
    registeredExtJSType: 'x-imata-loc-sh-lookup',
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

    searchExternalService: function (values) {
        this.externalServiceStore.setBaseParam('q', values.term);
        this.externalServiceStore.load();
    },

    retrieveRecord: function(record, callback) {
        Ext.Ajax.request({
            url: '/locsh/http://id.loc.gov/authorities/subjects/' + record.id + '.rdf',
            success: function(resp, data, options) {
                var LoCSHObj = {variantTerms: [], sources: [], broaderTerms: [], narrowerTerms: []}, doc, variants, sources;
                doc = resp.responseXML;
                LoCSHObj.termId = record.id;
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
                callback(LoCSHObj);
            },
            scope: this
        });
    },

    extractLinkData: function(record, callback) {
        if(!(record instanceof Ext.data.Record)) {
            callback(record);
        } else {
            this.retrieveRecord(record, callback)
        }
    }
});
