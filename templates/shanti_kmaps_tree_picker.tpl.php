<!--
 Available variables:
   $namespace - used by the javascript to coordinate related filters and typeahead inputs
   $display - the user-facing unpluralized filter name, Feature Type or Associated Subject
-->

<div id="<?php print $namespace; ?>-tree-wrapper"
     class="kmap-tree-picker">
    <label><span>Search:</span> Select KMaps <?php print $domain; ?></label>
    <input id="<?php print $namespace; ?>-search-term"
           class="kmap-search-term form-control form-text" type="text"
           placeholder="Search <?php print $domain; ?>">
    <button type="button" class="btn searchreset" style="display: none;"><span class="icon"></span></button>
    <button type='button' id='<?php print $namespace; ?>-search-button' name='<?php print $namespace; ?>-search-button' class='kmap-search-button' value=''>SEARCH</button>
</div>