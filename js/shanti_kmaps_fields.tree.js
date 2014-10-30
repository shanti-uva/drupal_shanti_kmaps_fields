(function($){

// Local "globals"
var search_term   = '';
var dictionary    = {}; 
var picked        = {}; 
var ancestor_tree = {};
var S = {}; // Settings passed
submit_count = 0;

Drupal.behaviors.shantiKmapsFieldsTree = {

  attach: function (context, settings) {
  
    // Grab settings from server
    S = settings.shanti_kmaps_fields; 
		    
    // Event handler 0: On first load, go through each instance of the field and update its picklist
    $('.field-type-shanti-kmaps-fields-default.field-widget-kmap-tree-picker-.form-wrapper').once('each', function(){
      var my_field = $(this).find('.my_field_id').val();
      var resultBox = $('#'+ my_field + '_result_box');
      var picked_already = $.parseJSON(S[my_field].picked_already);
      picked[my_field] = {}; // Init picklist for this field
      for (kmap_id in picked_already) {
        var item = picked_already[kmap_id];
        picked[my_field][kmap_id] = item;
        updateDictionary(kmap_id, item.id, item.header, item.path, my_field);
        var pickedElement = $("<div/>").addClass('selected-kmap').appendTo(resultBox);         
        var deleteButton  = $("<span>X</span>").addClass('delete-me').addClass(kmap_id).appendTo(pickedElement);
        var elementLabel  = $("<span>"+item.header +" "+kmap_id+"</span>").addClass('kmap_label').appendTo(pickedElement);
        var kmapIDint     = $("<span>"+item.id +"</span>").addClass('kmap_id_int').addClass('datastore').appendTo(pickedElement);
        var kmapPath      = $("<span>"+item.path +"</span>").addClass('kmap_path').addClass('datastore').appendTo(pickedElement);
        var kmapHeader    = $("<span>"+item.header +"</span>").addClass('kmap_header').addClass('datastore').appendTo(pickedElement);
      }
    });
    		
    // Event handler 1: Fetch search results and build a "pick tree"
    $('.kmap_search_term_button').live('click', function(e){
      var my_field = $(this).attr('id').replace('_search_button','');
      var pickTree = $('#' + my_field + '_pick_tree');
      pickTree.html("<p>Searching ...</p>");
      var searchField = $('#' + my_field + '_search_term');
      search_term = searchField.val();
      ancestor_tree[my_field] = {}; // reinit
      dictionary[my_field] = {}; // reinit
      $.getJSON(S[my_field].kmap_url + search_term, function(results){
        if (results.length != 0) {
          pickTree.html("<p>We found " + results.meta.count + " item(s) containing the string /"+search_term+"/:</p>");
          for (var i in results.data) {
            var R = results.data[i];
            var kmap_id   = 'F' + R.id;
            var path      = ancestorsToPath(R.ancestors);
            updateDictionary(kmap_id, R.id, R.header, path, my_field);
            addAncestorsToDictionary(R.ancestors, my_field)
            parsePath(R.ancestors, my_field); // populates ancestor_tree              
          }
          // Need also to see if any of the new items are in the pick list ...
          JSONTreeToHTML(ancestor_tree[my_field],pickTree); 
          Drupal.attachBehaviors();     
        } else {
          pickTree.html("No results for the string /" + search_term + "/.");
        }
      });
    });
    
    // Event handler 2: When kmap items are selected from the pick tree, cross them out
    // and populate the result box
    $('.kmap_pick_tree .kmap-item').unbind('click').bind('click', function(e){
      var my_field = $(this).closest('.kmap_pick_tree').attr('id').replace('_pick_tree',''); 
      var resultBox = $('#' + my_field + '_result_box');
      var kmap_header = $(this).html();
      var kmap_id = extractKMapID(kmap_header);
      if ($(this).hasClass('picked') && $(this).hasClass(kmap_id)) {
        alert("This item is already in your pick list. " + kmap_id); // THIS GETS CALLED MULTIPLE TIMES!
      } else {
        picked[my_field][kmap_id] = dictionary[my_field][kmap_id]; // TRAP ERROR
        $(this).addClass('picked');
        var pickedElement = $("<div/>").addClass('selected-kmap').appendTo(resultBox);         
        var deleteButton = $("<span>X</span>").addClass('delete-me').addClass(kmap_id).appendTo(pickedElement);
        var elementLabel = $("<span>"+kmap_header+"</span>").addClass('kmap_label').appendTo(pickedElement);
        var kmapIDint = $("<span>"+dictionary[my_field][kmap_id].id+"</span>").addClass('kmap_id_int').addClass('datastore').appendTo(pickedElement);
        var kmapPath = $("<span>"+dictionary[my_field][kmap_id].path+"</span>").addClass('kmap_path').addClass('datastore').appendTo(pickedElement);
        var kmapHeader = $("<span>"+dictionary[my_field][kmap_id].header+"</span>").addClass('kmap_header').addClass('datastore').appendTo(pickedElement);
        Drupal.attachBehaviors(resultBox);
      }
    });
    
    // Event handler 3: When selected items are deleted, remove them and reset the item in the pick tree
    $('.kmap_result_box .delete-me').unbind('click').bind('click', function(e){
      var my_field = $(this).closest('.kmap_result_box').attr('id').replace('_result_box','');
      var resultBox = $('#' + my_field + '_result_box');
      var pickedElement = $(this).parent();
      var kmap_id = extractKMapID($(this).next('span.kmap_label').html());
      if (dictionary[my_field][kmap_id] == null) {
        if (!confirm("This term is not in the currently selected tree; if you delete it, you'll need to search for it again. Are you sure you want to delete it?")) return;
      }
      delete picked[my_field][kmap_id];
      var pickTreeElement = $('#' + my_field + '_pick_tree .kmap-item.' + kmap_id);
      pickTreeElement.removeClass('picked');
      pickedElement.remove();
      //Drupal.attachBehaviors(); 
    });

    // Event handler 4: When the form is submitted, dump picked items into hidden box
    // Need to pass the entity type so this can work with other entity types ....
    $('form.node-form').submit(function(e){
      submit_count++; 
      if (submit_count > 1) return; // No idea why I have to do this bullshit but without it this gets calls multiple times >:(
      for (field in picked) {
        for (kmap_id in picked[field]) {
          if (dictionary[field][kmap_id]) {
            picked[field][kmap_id] = dictionary[field][kmap_id];
          }
        }
        $('#' + field + '_hidden_box').append(JSON.stringify(picked[field]));
      }
      return;
    });

  },
  
  detach: function (context, settings) {
  
  }
  
};

// Utility Functions

// Called within the search event handler    
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

function parsePath(ancestors, cur_field){
  var cur = ancestor_tree[cur_field];
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

function ancestorsToPath(ancestors) {
  var path = '';
  var copy = ancestors.slice(0); // Clone
  for (i in copy) {
    path += '{{' + copy[i].header + '}}';
  }
  return path;
}

function updateDictionary(kmap_id,id,header,path,cur_field) {
  dictionary[cur_field]                     = dictionary[cur_field] || {};
  dictionary[cur_field][kmap_id]            = dictionary[cur_field][kmap_id] || {};
  dictionary[cur_field][kmap_id]['id']      = dictionary[cur_field][kmap_id]['id'] || id;
  dictionary[cur_field][kmap_id]['header']  = dictionary[cur_field][kmap_id]['header'] || header;
  dictionary[cur_field][kmap_id]['path']    = dictionary[cur_field][kmap_id]['path'] || path;   
  dictionary[cur_field][kmap_id]['domain']  = dictionary[cur_field][kmap_id]['domain'] || S[cur_field].domain;   
}

function addAncestorsToDictionary(ancestors, cur_field) {
  var copy = ancestors.slice(0); // Clone
  while (a = copy.pop()) {
    var kmap_id = 'F' + a.id;
    var path = ancestorsToPath(copy);
    updateDictionary(kmap_id, a.id, a.header, path, cur_field);
  }
}

})(jQuery);