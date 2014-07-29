(function($){

var search_term = '';
var ancestor_tree = {};
var dictionary = {};
var pick_list = {};

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
      $.getJSON(test_url + search_term,function(results){
      	ancestor_tree = {};
      	if (results.length != 0) {
			
					// Announce things
      		var result_count = results.meta.count;
      		pickTree.html("<p>We found " + result_count + " item(s) containing the string /"+search_term+"/:</p>");

					// Convert data to useful local structures
					for (var i in results.data) {
						var kmap_id = 'F' + results.data[i].id;
						dictionary[kmap_id] = dictionary[kmap_id] || {}
						dictionary[kmap_id]['header'] =  results.data[i].header;
						dictionary[kmap_id]['path'] =  ancestorsToPath(results.data[i].ancestors);
						parsePath(results.data[i].ancestors); // popular ancestor_tree
					}

					JSONTreeToHTML(ancestor_tree,pickTree,'kmap-items'); 
					//pickTree.easytree({});
					// ALL THESE PATHS NEED TO BE QUALIFIED BY THE UNIQUE FIELD ...
					$('.kmap-item.matching').css('font-weight','bold').css('color','red');
					$('.kmap-item.terminal').css('font-weight','bold').css('color','green');
					$('.kmap-item').click(function(e){
						var kmap_id = $(this).attr('data-id');
						var kmap_header = $(this).html();
						if ($(this).hasClass('picked')) {
							alert("This item is already in your pick list.");
						} else {
							var mypath = dictionary[kmap_id]['path'];
							alert(mypath);
							resultBox.append("<div data-id='"+kmap_id+"' class='selected-kmap'><span class='delete-me'>X</span><span>"+kmap_header+"</span></div>");
							//$('#kmap-item-'+kmap_id+'.terminal').css('display','none');
							//$('#kmap-item-'+kmap_id+'.folder').css('color','gray');
							$('#kmap-item-'+kmap_id).css('color','gray').css('text-decoration','line-through').addClass('picked');
						}
					});
				} else {
          pickTree.html("No results for the string /" + search_term + "/.");
				}
      });
      
    });
    
  }
};

// Utility Functions

function parsePath(ancestors){
	var cur = ancestor_tree;
	ancestors.slice(0).forEach(function(elem){
		var key = elem.header + " F" + elem.id;
		cur[key] = cur[key] || {};
		cur = cur[key];
	});
}

function JSONTreeToHTML(tree,el,ulid) {
  var ul = $("<ul/>");
  if (ulid) { 
    ul.attr("id",ulid); 
  }
  el.append(ul);
  var rgx1 = /\s(\w?\d+)$/; // THIS COULD CHANGE
  var rgx2 = new RegExp(search_term, 'gi');
  var myclass = '';
  for (item in tree) {
	  var myclass = 'kmap-item';
		var matches = rgx1.exec(item);
		var kmap_id = matches[1];
		if (rgx2.exec(item) != null) myclass += ' matching';
  	var children = 0; for (k in tree[item]) children++;
    if (children) {
    	myclass += ' folder';
      ul.append("<li data-id=\""+kmap_id+"\" class=\""+myclass+"\" id=\"kmap-item-"+kmap_id+"\">" + item + "</li>");
      JSONTreeToHTML(tree[item],ul); // RECURSE
    } else {
    	myclass += ' terminal';
      ul.append("<li data-id=\""+kmap_id+"\" class=\""+myclass+"\" id=\"kmap-item-"+kmap_id+"\">"+ item +"</li>");
    } 
  }
}

function ancestorsToPath (ancestors) {
	path = '';
	for (i in ancestors) path += '{{' + ancestors[i].header + '}}';
	return path;
}

})(jQuery);




