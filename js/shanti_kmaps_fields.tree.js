(function($){

/**
* TO DO:
* -- When creating this page from the database, the picklist needs to be
* populated with dictionary data
*/

// Local "globals"
var search_term   = '';
var dictionary    = {}; // Needs to persist across reattachments ...
var picked        = {}; // SHOULD BE POPULATED AHEAD OF TIME FROM SERVER
var ancestor_tree = {};
var t = 0; // Keeps track of how many times this code is attached; used for poor man's once()

Drupal.behaviors.shantiKmapsFieldsTree = {

  attach: function (context, settings) {
  
    t++; // DO NOT REMOVE

    // Grab settings from server
    var S = settings.shanti_kmaps_fields;
		
    // Define widgets 
    var thisField     = $('#'+S.field_id, context);
    var searchField   = $('#'+S.search_input_id, context);
    var searchButton  = $('#'+S.field_id+' .kmap_search_term_button', context);
    var pickTree      = $('#'+S.pick_tree_id, context);
    var pickTreeItem  = $('#'+S.pick_tree_id+ ' li.kmap-item', context);
    var resultBox     = $('#'+S.res_box_id, context);
    var resultBoxDel  = $('#'+S.res_box_id+' .delete-me', context);
    var hiddenBox     = $('#'+S.hidden_box_id, context).css('display','none');
    
    // If it feels like the first time ...
		if(t==1) {    
			var picked_already = $.parseJSON(S.picked_already);
			console.log(picked_already);
			for (kmap_id in picked_already) {
				var item = picked_already[kmap_id];
				picked[kmap_id] = item;
				// Move this into a function with args (container, id, header, path) and use below too
				var pickedElement = $("<div/>").addClass('selected-kmap').appendTo(resultBox);         
				var deleteButton = $("<span>X</span>").addClass('delete-me').addClass(kmap_id).appendTo(pickedElement);
				var elementLabel = $("<span>"+item['header']+" "+kmap_id+"</span>").addClass('kmap_label').appendTo(pickedElement);
				var kmapIDint = $("<span>"+item['id']+"</span>").addClass('kmap_id_int').addClass('datastore').appendTo(pickedElement);
				var kmapPath = $("<span>"+item['path']+"</span>").addClass('kmap_path').addClass('datastore').appendTo(pickedElement);
				var kmapHeader = $("<span>"+item['header']+"</span>").addClass('kmap_header').addClass('datastore').appendTo(pickedElement);
			}
			Drupal.attachBehaviors(); 
		}
		
    // Event handler 1: Fetch search results and build a "pick tree"
    searchButton.click(function(e){
      pickTree.html("<p>Searching ...</p>");
      search_term = searchField.val();
      $.getJSON(S.kmap_url + search_term,function(results){
        ancestor_tree = {}; // reinit
        dictionary = {}; // reinit
        if (results.length != 0) {
          var result_count = results.meta.count;
          pickTree.html("<p>We found " + result_count + " item(s) containing the string /"+search_term+"/:</p>");
          for (var i in results.data) {
            var R = results.data[i];
            var kmap_id = 'F' + R.id;
            updateDictionary(kmap_id, R.id, R.header, ancestorsToPath(R.ancestors));
            addAncestorsToDictionary(R.ancestors);
            parsePath(R.ancestors); // populates ancestor_tree
          }
          // Need also to see if any of the new items are in the pick list ...
          JSONTreeToHTML(ancestor_tree,pickTree); 
          Drupal.attachBehaviors(thisField);     
        } else {
          pickTree.html("No results for the string /" + search_term + "/.");
        }
      });
    });
        
    // Event handler 2: When kmap items are selected from the pick tree, cross them out
    // and populate the result box
    pickTreeItem.unbind('click').click(function(e){
    //pickTreeItem.click(function(e){ // CAN'T USE THIS BECAUSE attacheBehaviors rebinds below
      var kmap_header = $(this).html();
      var kmap_id = extractKMapID(kmap_header);
      if ($(this).hasClass('picked') && $(this).hasClass(kmap_id)) {
        alert("This item is already in your pick list. " + kmap_id); // THIS GETS CALLED MULTIPLE TIMES!
      } else {
        picked[kmap_id] = dictionary[kmap_id]; // TRAP ERROR
        $(this).addClass('picked');
        var pickedElement = $("<div/>").addClass('selected-kmap').appendTo(resultBox);         
        var deleteButton = $("<span>X</span>").addClass('delete-me').addClass(kmap_id).appendTo(pickedElement);
        var elementLabel = $("<span>"+kmap_header+"</span>").addClass('kmap_label').appendTo(pickedElement);
        var kmapIDint = $("<span>"+dictionary[kmap_id].id+"</span>").addClass('kmap_id_int').addClass('datastore').appendTo(pickedElement);
        var kmapPath = $("<span>"+dictionary[kmap_id].path+"</span>").addClass('kmap_path').addClass('datastore').appendTo(pickedElement);
        var kmapHeader = $("<span>"+dictionary[kmap_id].header+"</span>").addClass('kmap_header').addClass('datastore').appendTo(pickedElement);
        Drupal.attachBehaviors(); // Gah! This does not take an arg; THIS MAY SCREW UP OTHER FIELDS ON THE PAGE
      }
    });
    
    // Event handler 3: When selected items are deleted, remove them and reset the item in the pick tree
    resultBoxDel.unbind('click').click(function(e){
      var pickedElement = $(this).parent();
      var kmap_id = extractKMapID($(this).next('span.kmap_label').html());
      if (dictionary[kmap_id] == null) {
        if (!confirm("This term is not in the currently selected tree; if you delete it, you'll need to search for it again. Are you sure you want to delete it?")) return;
      }
      delete picked[kmap_id]; 
      var pickTreeElement = $('#'+S.pick_tree_id+' .kmap-item.'+kmap_id, context);
      pickTreeElement.removeClass('picked');
      Drupal.detachBehaviors(resultBox); // Don't know why this works but other times no
      pickedElement.remove();
      Drupal.attachBehaviors(resultBox); 
    });
    
    // Event handler 4: When the form is submitted, dump picked items into hidden box
    $('form',context).unbind('submit').submit(function(e){
      for (kmap_id in picked) {
        if (dictionary[kmap_id]) picked[kmap_id] = dictionary[kmap_id];
      }
      hiddenBox.append(JSON.stringify(picked));
      return;
    });
            
  },
  
  detach: function (context, settings) {
    
    // Grab settings from server
    var S = settings.shanti_kmaps_fields;
    
    // Define widgets 
    //var thisField     = $('#'+S.field_id, context);
    //var searchField   = $('#'+S.search_input_id, context);
    //var searchButton  = $('#'+S.field_id+' .kmap_search_term_button', context);
    //var pickTree      = $('#'+S.pick_tree_id, context);
    var pickTreeItem    = $('#'+S.pick_tree_id+ ' li.kmap-item', context);
    //var resultBox     = $('#'+S.res_box_id, context);
    var resultBoxDel    = $('#'+S.res_box_id+' .delete-me', context);
    //var hiddenBox     = $('#'+S.hidden_box_id, context).css('display','none');
    var form            = $('form',context);
        
    // Unbind relevant event handlers? Not sure if these are doing anything
    pickTreeItem.unbind('click',  function(e){  });
    resultBoxDel.unbind('click',  function(e){  });
    form.unbind('submit',         function(e){  });
  
  }
  
};

// Utility Functions

// Called within the search event handler    
// Could be moved out attach scope ...
function JSONTreeToHTML(tree,el,ulid) {
  var ul = $("<ul/>");
  if (ulid) { ul.attr("id",ulid); }
  el.append(ul);
  var rgx2 = new RegExp(search_term, 'gi');
  for (item in tree) {
    var kmap_id = extractKMapID(item);
    var li = $("<li>" + item + "</li>").addClass('kmap-item').addClass(kmap_id);
    if (rgx2.exec(item) != null) li.addClass('matching');
    if (picked[kmap_id] != null) li.addClass('picked');
    li.appendTo(ul);
    var children = 0; for (k in tree[item]) { children++; break; }
    if (children) {
      JSONTreeToHTML(tree[item],ul);
    } else {
      li.addClass('terminal');
    } 
  }
}

function parsePath(ancestors){
  var cur = ancestor_tree;
  ancestors.slice(0).forEach(function(elem){
    var key = elem.header + " F" + elem.id;
    cur[key] = cur[key] || {};
    // Add items to element here
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

function ancestorsToPath(ancestors) {
  path = '';
  var copy = ancestors.slice(0); // Clone
  for (i in copy) path += '{{' + copy[i].header + '}}';
  return path;
}

function updateDictionary(kmap_id,id,header,path) {
  dictionary[kmap_id] = dictionary[kmap_id] || {};
  dictionary[kmap_id]['id'] = dictionary[kmap_id]['id'] || id;
  dictionary[kmap_id]['header'] = dictionary[kmap_id]['header'] || header;
  dictionary[kmap_id]['path'] = dictionary[kmap_id]['path'] || path;   
}

function addAncestorsToDictionary(ancestors) {
  var copy = ancestors.slice(0); // Clone
  while (a = copy.pop()) {
    var kmap_id = 'F' + a.id;
    updateDictionary(kmap_id,a.id,a.header,ancestorsToPath(copy));
  }
}


})(jQuery);




