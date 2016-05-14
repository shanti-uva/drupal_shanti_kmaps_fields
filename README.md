# SHANTI KMaps Fields

A field for adding KMap IDs from the KMaps API to Drupal assets and updating the KMaps Index.

## Dependencies

All widgets depend on [SHANTI KMaps Admin](https://github.com/shanti-uva/drupal_shanti_kmaps_admin]).

Some widgets require additional modules, which can be downloaded from [Drupal KMaps Modules](https://github.com/shanti-uva/drupal_kmaps_modules).
* Autocomplete: Typeahead and SHANTI KMaps Typeahead.
* Autocomplete Tree: Typeahead, SHANTI KMaps Typeahead, and SHANTI KMaps Tree.

Note that installing SHANTI KMaps Typeahead and SHANTI KMaps Tree involves pulling additional repositories into your sites/all/libraries directory.


## How To Use This Module

1. Install and enable as you would any Drupal module.
2. **Visit the Admin page** (admin/config/content/shanti_kmaps_admin), which is organized under "Content Authoring." There you need to enter the following values:
  1. *KMaps Subjects Server*: This is the server used to retrieve data for KMap subject terms. The current default value is "http://subjects.kmaps.virginia.edu".
  2. *KMaps Places Server*: This is the server used to retrieve data for KMap place terms. The current default value is "http://places.kmaps.virginia.edu".
  3. *KMaps Subjects Explorer*: This is the site used to view and explore KMap subject terms in the SHANTI KMap Solr Index.
KMaps Places Explorer. The current default value is "http://badger.drupal-dev.shanti.virginia.edu/subjects/__KMAPID__", where \_\_KMAPID\_\_ is a placeholder for the actual KMap ID when called.
  4. *KMaps Places Explorer*: This is the site used to view and explore KMap place terms in the SHANTI KMap Solr Index. The current default value is "http://badger.drupal-dev.shanti.virginia.edu/places/__KMAPID__", where \_\_KMAPID\_\_ is a placeholder for the actual KMap ID when called.
  5. *Do you want to publish your KMap data to the SHANTI KMap Solr Index?* Check this if you want to publish your content for use by other sites, such as the Subjects and Places explorers described above. 
  6. *KMaps Solr Server Assets Index*. The URL to the SHANTI KMap Assets index. Note that this URL may need to include a path to the specific index. The current default value is "http://kidx.shanti.virginia.edu/solr/kmindex".
  7. *KMaps Solr Server Terms Index*. The URL to the SHANTI KMap Terms index. Note that this URL may need to include a path to the specific index. The current default value is "http://kidx.shanti.virginia.edu/solr/termindex-dev".
  8. *KMaps Solr Asset Types*. A comma delimited list of asset types, used throughout the KMap system. These values should be lowercase plurals with no spaces. Ideally, this list would come from somewhere authoritative, such as the Rail KMaps server itself.
7. Add a field of type **KMap Term** to a content type.
  1. Choose a widget type, **Tree**, **Autocomplete**, or **Autocomplete Tree**.
  2. Under Field Settings, choose the KMap domain -- subjects or places -- to be associated with this field wherever it is used.
  3. Don't worry about "Number of values" under Field Settings.
  3. Under the Field instance settings (under the "Edit" tab), optionally add a "KMap ID View." This is a local Drupal path for a view that needs to be created with which to search for nodes of this content type by KMap ID. This value is used by the popover field formatter. Use \_\_KMAPID\_\_ to signify the KMap ID value in the path.
  3. Also under the Field instance settings, optionally add a "Root KMap ID". This restricts terms to occur within a particular hierarchy.
  2. Also under the Field instance settings, set an optional KMap Term Limit, which specifies the maximum number of matched terms to return from a KMap search. This is important for the **Autocomplete** and **Autocomplete Tree** widgets, because higher limits may lead to slower search. You *could* enter 0 for no limit, but don't!
8. In choose a field formatter, under Manage Display, don't choose **popover with link options** unless you are using a SHANTI Sarvaka theme. 
9. Create a node of the content type associated with the field type. 
10. If you are using the **Tree** widget, enter a search string into the text field and click on the "Search" button. If you see a KMap term you want associated with your node, click on it and it will appear in the list of associated terms below the tree. You can add as many terms as you'd like. You may delete terms from the list by clicking on the "X". 
11. If you are using the **Autocomplete** widget, start typing a search string into the text field. Select a term from the list that pops up, or type something else into the field.
12. If you are using the **Autocomplete Tree** widget, you can either browse the tree directly, or enter a search term and restrict the tree to the search results. Use the arrow keys to navigate the results, and press ENTER to select a term. Or click on a term or press ENTER directly in the tree.

The **Autocomplete Tree** widget is buggy and not for production use. See https://issues.shanti.virginia.edu/browse/MANU-2325 for further details.