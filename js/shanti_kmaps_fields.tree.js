(function($){

// Local "globals"
var dictionary    = {}; 
var picked        = {}; 
var ancestor_tree = {};
var S             = {}; // Settings passed
var submit_count  = 0;

Drupal.behaviors.shantiKmapsFieldsTree = {
  
  attach: function (context, settings) {
    
    S = settings.shanti_kmaps_fields;

    // Event handler 0: On first load, go through each instance of the field and update its picklist
    $('.kmap_result_box').once(function(){
      var resultBox = $(this); 
      var my_field = $(this).attr('id').replace('_result_box','');  
      var picked_already = $.parseJSON(S[my_field].picked_already);
      picked[my_field] = {}; // Init picklist for this field
      for (kmap_id in picked_already) {
        var item = picked_already[kmap_id];
        picked[my_field][kmap_id] = item;
        updateDictionary(kmap_id, item.id, item.header, item.path, my_field);
        addPickedItem(resultBox,kmap_id,item);
      }         
    });

    // Event handler 1: Fetch search results and build a "pick tree"
    $('.kmap_search_button').on('click',function (e){
      var my_field = $(this).attr('id').replace('_search_button',''); 
      var pickTree = $('#' + my_field + '_pick_tree');        
      var search_term = $('#' + my_field + '_search_term').val();
      pickTree.html("<p>Searching ...</p>");
      ancestor_tree[my_field] = {}; // reinit
      dictionary[my_field] = {}; // reinit
      search_url = S[my_field].kmap_url + search_term;
      $.getJSON(search_url, function(results){
        if (results.data.length != 0) {
          pickTree.html("<p>We found " + results.meta.count + " item(s) containing the string /" + search_term + "/.</p>");
          for (var i in results.data) {
            var R = results.data[i];
            var kmap_id   = 'F' + R.id;
            var path      = ancestorsToPath(R.ancestors);
            updateDictionary(kmap_id, R.id, R.header, path, my_field);
            addAncestorsToDictionary(R.ancestors, my_field)
            parsePath(R.ancestors, my_field); // populates ancestor_tree              
          }
          // Need also to see if any of the new items are in the pick list ...
          JSONTreeToHTML(my_field,ancestor_tree[my_field],pickTree,search_term);
          pickTree.css({'max-height':'350px','overflow':'scroll','padding':'5px','margin-bottom':'5px','background':'#EEE'}); 
          Drupal.attachBehaviors(pickTree);
        } else {  
          pickTree.html("No results for the string /" + search_term + "/. Click <a href='" + search_url + "' target='_blank'>here</a> to see if the KMaps server is working.");
        }
      });
    });
  
    // Event handler 2: When kmap items are selected from the pick tree, cross them out
    // and populate the result box
    $('.kmap_pick_tree .kmap-item').on('click', function(e){
      var my_field = $(this).closest('.kmap_pick_tree').attr('id').replace('_pick_tree',''); 
      var resultBox = $('#' + my_field + '_result_box');
      var kmap_header = $(this).html();
      var kmap_id = extractKMapID(kmap_header);
      if ($(this).hasClass('picked') && $(this).hasClass(kmap_id)) {
        $('.selected-kmap.'+kmap_id).stop().css("background-color", "#FFFF9C").animate({ backgroundColor: "#FFFFFF"}, 1500);;
      } else {
        picked[my_field][kmap_id] = dictionary[my_field][kmap_id]; // TRAP ERROR
        addPickedItem(resultBox,kmap_id,dictionary[my_field][kmap_id]);
        $(this).addClass('picked');
      }
    });
    
    // Event handler 3: When selected items are deleted, remove them and reset the item in the pick tree
    $('.kmap_result_box .delete-me').on('click', function(e){
      var my_field = $(this).closest('.kmap_result_box').attr('id').replace('_result_box','');
      var resultBox = $('#' + my_field + '_result_box');
      var pickedElement = $(this).parent();
      var kmap_id = extractKMapID($(this).next('span.kmap_label').html());
      //if (typeof $('#'+my_field+'_pick_tree .kmap-item.'+kmap_id).val() == 'undefined') { // TRUTH FAILS
      //  if (!confirm("This term "+kmap_id+" is not in the currently selected tree; if you delete it, you'll need to search for it again. Are you sure you want to delete it?")) return;
      //}
      delete picked[my_field][kmap_id];
      var pickTreeElement = $('#' + my_field + '_pick_tree .kmap-item.' + kmap_id);
      pickTreeElement.removeClass('picked');
      pickedElement.remove();
    });

    // Event handler 4: When the form is submitted, dump picked items into hidden form box
    // to send back to server
    // Need to pass the entity type so this can work with other entity types (i.e. node-form) ...
    $('form.node-form').submit(function(e){
      submit_count++;
      if (submit_count > 1) return; // Need because submit gets called multiple times >:(
      for (my_field in picked) {
        for (kmap_id in picked[my_field]) {
          if (dictionary[my_field][kmap_id]) {
            picked[my_field][kmap_id] = dictionary[my_field][kmap_id];
          } else {
            // This happens for existing kmap ids
          }
        }
        $('#' + my_field + '_hidden_box').append(JSON.stringify(picked[my_field]));
      }
      return;
    });

  },
  
  detach: function (context, settings) {
  
  }

};

// Utility Functions

// Called within the search event handler    
function JSONTreeToHTML(my_field,tree,el,ulid,search_term,root_kmapid) {
  var ul = $("<ul/>");
  if (ulid) { ul.attr("id",ulid); }
  el.append(ul);
  var rgx2 = new RegExp(search_term, 'gi');
  for (item in tree) {
    var kmap_id = extractKMapID(item);
    var li = $("<li>" + item + "</li>").addClass('kmap-item').addClass(kmap_id);
    if (rgx2.exec(item) != null) li.addClass('matching');
    if (picked[my_field][kmap_id] != null) li.addClass('picked');
    li.appendTo(ul);
    var children = 0; for (k in tree[item]) { children++; break; }
    if (children) {
      JSONTreeToHTML(my_field,tree[item],ul,search_term);
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

function extractKMapID(line) {
  var kmap_id = null;
  var rgx1 = /\s(\w?\d+)$/;
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

// Function to create items in the picklist
function addPickedItem(containerElement,kmap_id,item) {
  var pickedElement = $("<div/>").addClass('selected-kmap ' + kmap_id).appendTo(containerElement);         
  var deleteButton  = $("<span>X</span>").addClass('delete-me').addClass(kmap_id).appendTo(pickedElement);
  var elementLabel  = $("<span>"+item.header +" "+kmap_id+"</span>").addClass('kmap_label').appendTo(pickedElement);
  var kmapIDint     = $("<span>"+item.id +"</span>").addClass('kmap_id_int').addClass('datastore').appendTo(pickedElement);
  var kmapPath      = $("<span>"+item.path +"</span>").addClass('kmap_path').addClass('datastore').appendTo(pickedElement);
  var kmapHeader    = $("<span>"+item.header +"</span>").addClass('kmap_header').addClass('datastore').appendTo(pickedElement);
  Drupal.attachBehaviors(pickedElement);
}

})(jQuery);
