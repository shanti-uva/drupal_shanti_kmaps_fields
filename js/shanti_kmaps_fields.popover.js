(function($){

Drupal.behaviors.shantiKmapsFieldsPopover = {


  attach: function (context, settings) {    
    // Reload the Bootstrap stuff ... This should be in the theme, right?
  
    //$('.popover-link').popover();
  
    $('#shanti-texts-sidebar-tabs li a').on('click', function(e){
      //Drupal.attachBehaviors();
    });
  
  },
  
  detach: function (context, settings) {
  
  }
  
};


})(jQuery);