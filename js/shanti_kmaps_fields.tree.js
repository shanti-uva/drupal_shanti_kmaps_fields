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
    var kmap_url        = settings.shanti_kmaps_fields.api_url;
    var test_url        = settings.shanti_kmaps_fields.test_url;
    var search_input_id = settings.shanti_kmaps_fields.search_input_id;
    var pick_tree_id    = settings.shanti_kmaps_fields.pick_tree_id;
    var res_box_id    	= settings.shanti_kmaps_fields.res_box_id;
    var field_id        = settings.shanti_kmaps_fields.field_id;
    
    // Define widgets
    var thisField     = $('#'+field_id, context);
    
    // THESE IDs need to be prefixed ...
    var searchButton  = $('#'+field_id+' .kmap_search_term_button', context);
    var pickTree      = $('#'+pick_tree_id, context);
    var resultBox     = $('#'+res_box_id, context);
    
    //edit-field-kmap-term-2-und-kmap-field-kmap-pick-tree
    
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
            addAncestorsToDictionary(results.data[i].ancestors);
            parsePath(results.data[i].ancestors); // popular ancestor_tree
          }
          
          // Convert the just created JSON tree into an HTML list element 
          JSONTreeToHTML(ancestor_tree,pickTree,'kmap-items'); 
          Drupal.attachBehaviors(context);  
        
        } else {
          pickTree.html("No results for the string /" + search_term + "/.");
        }
      });
      
    });
    
    $('.kmap-item',context).click(function(e){
      var kmap_id = $(this).attr('data-id');
      var kmap_header = $(this).html();
      if ($(this).hasClass('picked')) {
        alert("This item is already in your pick list.");
      } else {
        //var pickedElement = $("<div data-id='"+kmap_id+"' class='selected-kmap'><span class='delete-me' id='delete-me-"+kmap_id+"'>X</span><span>"+kmap_header+"</span></div>").appendTo(resultBox); 
        var pickedElement = $("<div/>").appendTo(resultBox); 
        pickedElement.attr('data-id',kmap_id).addClass('selected-kmap');
        var deleteButton = $("<span>X</span>");
        deleteButton.addClass('delete-me').attr('id','delete-me-'+kmap_id);
        deleteButton.appendTo(pickedElement);
        var elementLabel = $("<span>"+kmap_header+"</span>");
        elementLabel.appendTo(pickedElement);
        $(this).addClass('picked');
        Drupal.attachBehaviors(pickedElement);
      }
    });

    $('.delete-me',context).click(function(e){
      var pickedElement = $(this).parent();
      var kmap_id = pickedElement.attr('data-id');
      var pickTreeElement = $('#kmap-item-'+kmap_id, context);
      pickTreeElement.removeClass('picked'); // <-- NOT WORKING!!!
      pickedElement.remove();
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
  if (ulid) { ul.attr("id",ulid); }
  el.append(ul);

  var rgx1 = /\s(\w?\d+)$/; // THIS COULD CHANGE
  var rgx2 = new RegExp(search_term, 'gi');

  for (item in tree) {
    
    // Grap the kmap_id
    var matches = rgx1.exec(item);
    var kmap_id = matches[1];

    // Create the LI element
    var li = $("<li>" + item + "</li>");
    li.attr('data-id',kmap_id).attr('id','kmap-item-'+kmap_id).addClass('kmap-item');
    if (rgx2.exec(item) != null) li.addClass('matching');

    // Add to UL and attache behaviors
    li.appendTo(ul);
    //Drupal.attachBehaviors(li);

    var children = 0; for (k in tree[item]) children++;
    if (children) {
      li.addClass('folder');
      JSONTreeToHTML(tree[item],ul); // RECURSE
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




