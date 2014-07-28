(function($){

Drupal.behaviors.shantiKmapsFieldsTree = {

  attach: function (context, settings) {

    // Grab settings from server
    kmap_domain     = settings.shanti_kmaps_fields.domain; // May not need
    kmap_server     = settings.shanti_kmaps_fields.server; // May not need
    kmap_url        = settings.shanti_kmaps_fields.api_url;
    test_url        = settings.shanti_kmaps_fields.test_url;
    search_input_id = settings.shanti_kmaps_fields.search_input_id;
		
    // Define widgets
    var searchButton  = $('#kmap_search_term_button', context);
    var pickTree      = $('#kmap_pick_tree', context);
    var resultBox     = $('#kmap_result_box', context);
    
    searchButton.click(function(e){
      pickTree.html("<p>Searching ...</p>");
      search_term = $('#' + search_input_id).val();
      
      $.getJSON(test_url + search_term,function(data){
				pickTree.html("<p>Results:</p>");
      	if (data.length != 0) {
					for (var i in data) {
						parsePath(data[i].ancestors);
					}
					JSONTreeToHTML2(kmap_tree,pickTree,'kmap-items'); 
					$('.kmap-item.terminal').css('font-weight','bold').css('color','red');
					$('.kmap-item').click(function(e){
						var kmap_id = $(this).attr('data-id');
						var kmap_header = $(this).html();
						resultBox.append("<div data-id='"+kmap_id+"' class='selected-kmap'><span class='delete-me'>X</span><span>"+kmap_header+"</span></div>");
						$('#kmap-item-'+kmap_id+".terminal").css('display','none');
						$('#kmap-item-'+kmap_id+".folder").css('color','gray');
					});
				} else {
          pickTree.html("No results for /" + search_term + "/.");
				}
      });
      
    });
    
  }
};

// Utility Functions

kmap_tree = {}; // Used in the event handler above
function parsePath(ancestors){
	var cur = kmap_tree;
	ancestors.slice(0).forEach(function(elem){
		var key = elem.header + " F" + elem.id;
		cur[key] = cur[key] || {}; 
		cur = cur[key];
	});
}

function JSONTreeToHTML2(tree,el,ulid) {
  var ul = $("<ul/>");
  if (ulid) { 
    ul.attr("id",ulid); 
  }
  el.append(ul);
  var rgx = /\s(\w?\d+)$/; // THIS COULD CHANGE
  for (item in tree) {
		var matches = rgx.exec(item);
  	var children = 0; for (k in tree[item]) children++;
    if (children) {
      ul.append("<li data-id=\""+matches[1]+"\" class=\"kmap-item folder\" id=\"kmap-item-"+matches[1]+"\">" + item + "</li>");
      JSONTreeToHTML2(tree[item],ul); // RECURSE
    } else {
      ul.append("<li data-id=\""+matches[1]+"\" class=\"kmap-item terminal\" id=\"kmap-item-"+matches[1]+"\">"+ item +"</li>");
    } 
  }
}

})(jQuery);




