(function ($) {
    Drupal.behaviors.kmaps_typeahead = {
        attach: function (context, settings) {
            $('.field-widget-kmap-typeahead-picker', context).once('kmaps-search').find('.kmap_search_term').each(function () {
                var my_field = $(this).attr('id').replace('_search_term', '');
                var admin_settings = settings.shanti_kmaps_admin;
                var widget_settings = settings.shanti_kmaps_fields[my_field];

                $(this).kmapsTypeahead({
                    term_index: admin_settings.shanti_kmaps_admin_server_solr_terms,
                    domain: widget_settings.domain,
                    root_kmapid: widget_settings.root_kmapid ? widget_settings.root_kmapid : '',
                    max_terms: widget_settings.term_limit == 0 ? 999 : widget_settings.term_limit,
                    fq: admin_settings.shanti_kmaps_admin_solr_filter_query ? admin_settings.shanti_kmaps_admin_solr_filter_query : ''
                });
            });
        }
    }
})
(jQuery);