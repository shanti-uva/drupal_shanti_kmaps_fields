(function($){

var search_term   = '';
var ancestor_tree = {};
var dictionary    = {};
var pick_list     = {};

Drupal.behaviors.shantiKmapsFieldsTree = {

  attach: function (context, settings) {

    // Grab settings from server
    var kmap_domain     = settings.shanti_kmaps_fields.domain; // May not need
    var kmap_server     = settings.shanti_kmaps_fields.server; // May not need
    var kmap_url        = settings.shanti_kmaps_fields.kmap_url;
    var search_input_id = settings.shanti_kmaps_fields.search_input_id;
    var pick_tree_id    = settings.shanti_kmaps_fields.pick_tree_id;
    var res_box_id    	= settings.shanti_kmaps_fields.res_box_id;
    var field_id        = settings.shanti_kmaps_fields.field_id;
    
    // Define widgets
    var thisField     = $('#'+field_id, context);
    var searchField		= $('#'+search_input_id, context);
    var searchButton  = $('#'+field_id+' .kmap_search_term_button', context);
    var pickTree      = $('#'+pick_tree_id, context);
    var resultBox     = $('#'+res_box_id, context);
        
    searchButton.click(function(e){
      pickTree.html("<p>Searching ...</p>");
      search_term = searchField.val();
      $.getJSON(kmap_url + search_term,function(results){
        ancestor_tree = {}; // reinitialize
        if (results.length != 0) {
      
          // Announce things
          var result_count = results.meta.count;
          pickTree.html("<p>We found " + result_count + " item(s) containing the string /"+search_term+"/:</p>");

          // Convert data to useful local structures
          for (var i in results.data) {
            var kmap_id = 'F' + results.data[i].id;
            dictionary[kmap_id] = dictionary[kmap_id] || {}
            dictionary[kmap_id]['header'] = results.data[i].header;
            dictionary[kmap_id]['path'] = ancestorsToPath(results.data[i].ancestors);
            addAncestorsToDictionary(results.data[i].ancestors);
            parsePath(results.data[i].ancestors); // populates ancestor_tree
          }
          
          // Convert the just created JSON tree into an HTML list element 
          JSONTreeToHTML(ancestor_tree,pickTree,'kmap-items'); 
          Drupal.attachBehaviors();  
        
        } else {
          pickTree.html("No results for the string /" + search_term + "/.");
        }

      });
      
    });
        
    $('#'+pick_tree_id+' .kmap-item').click(function(e){
      //var kmap_id = $(this).attr('data-id');
      var kmap_id = extractKMapID($(this).html());
      var kmap_header = $(this).html(); // Or get from dictionary
      if ($(this).hasClass('picked') && $(this).hasClass(kmap_id)) {
        //alert("This item is already in your pick list. " + kmap_id);
				console.log("01 " + kmap_id);
      } else {
				console.log("02 " + kmap_id);
				$(this).addClass('picked');
        var pickedElement = $("<div/>").appendTo(resultBox); 
        //pickedElement.attr('data-id',kmap_id).addClass('selected-kmap');
        pickedElement.addClass('selected-kmap');
        var deleteButton = $("<span>X</span>");
        deleteButton.addClass('delete-me').addClass(kmap_id);
        deleteButton.appendTo(pickedElement);
        var elementLabel = $("<span>"+kmap_header+"</span>");
        elementLabel.appendTo(pickedElement);
        Drupal.attachBehaviors();
      }
	  });
	  
    $('#'+res_box_id+' .delete-me', context).click(function(e){
      var pickedElement = $(this).parent();
      //var kmap_id = pickedElement.attr('data-id');
      var kmap_id = extractKMapID($(this).next('span').html());
      var pickTreeElement = $('#'+pick_tree_id+' .kmap-item.'+kmap_id, context);
			pickedElement.remove();
      pickTreeElement.removeClass('picked');
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

var rgx1 = /\s(\w?\d+)$/; // THIS COULD CHANGE
function extractKMapID(line) {
	var kmap_id = null;
	var matches = rgx1.exec(line);
	if (matches != null) {
	  var kmap_id = matches[1];
	} 
	return kmap_id;
}

function JSONTreeToHTML(tree,el,ulid) {

  var ul = $("<ul/>");
  if (ulid) { ul.attr("id",ulid); }
  el.append(ul);

	var rgx2 = new RegExp(search_term, 'gi');

  for (item in tree) {
    
    // Grab the kmap_id
    //var matches = rgx1.exec(item);
    //var kmap_id = matches[1];
		var kmap_id = extractKMapID(item);
		
    // Create the LI element
    var li = $("<li>" + item + "</li>");
    //li.attr('data-id',kmap_id).addClass('kmap-item').addClass(kmap_id);
    li.addClass('kmap-item').addClass(kmap_id);
    if (rgx2.exec(item) != null) li.addClass('matching');

    // Add to UL and attache behaviors
    li.appendTo(ul);

    var children = 0; for (k in tree[item]) children++;
    if (children) {
      JSONTreeToHTML(tree[item],ul);
    } else {
      li.addClass('terminal');
    } 
  }
}

function ancestorsToPath(ancestors) {
  path = '';
  var copy = ancestors.slice(0,-1); // exclude the last, which is self 
  for (i in copy) path += '{{' + copy[i].header + '}}';
  return path;
}

function addAncestorsToDictionary(ancestors) {
  // Could add a test here, to see if the ancestors for this kmap id have been done ...
  // Do this by bundling this function with the dictionary loading that precedes and
  // just check if kmap_id is in the dictionary
  var copy = ancestors.slice(0); // Clone
  while (a = copy.pop()) {
    var kmap_id = 'F' + a.id;
    dictionary[kmap_id] = dictionary[kmap_id] || {};
    dictionary[kmap_id]['header'] = dictionary[kmap_id]['header'] || a.header;
    dictionary[kmap_id]['path'] = dictionary[kmap_id]['path'] || ancestorsToPath(copy);   
  }
}

})(jQuery);




