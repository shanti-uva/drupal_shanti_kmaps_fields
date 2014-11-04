# SHANTI KMaps Fields

A field for adding KMap IDs from the KMaps API to Drupal assets and updating the KMaps Index.

## How To Use This Module

1. Install and enable as you would any Drupal module.
2. Once installed, **visit the Admin page** (admin/config/content/shanti_kmaps_fields), which is organized under "Content Authoring." THere you need to enter the following values:
  1. *KMaps Subjects Server*: This is the server used to retrieve data for KMap subject terms. The current default value is "http://subjects.kmaps.virginia.edu".
  2. *KMaps Places Server*: This is the server used to retrieve data for KMap place terms. The current default value is "http://places.kmaps.virginia.edu".
  3. *KMaps Subjects Explorer*: This is the site used to view and explore KMap subject terms in the SHANTI KMap Solr Index.
KMaps Places Explorer. The current default value is "http://badger.drupal-dev.shanti.virginia.edu/subjects/__KMAPID__", where __KMAPID__ is a placeholder for the actual KMap ID when called.
  4. *KMaps Places Explorer*: This is the site used to view and explore KMap place terms in the SHANTI KMap Solr Index. The current default value is "http://badger.drupal-dev.shanti.virginia.edu/places/__KMAPID__", where __KMAPID__ is a placeholder for the actual KMap ID when called.
  5. *Do you want to publish your KMap data to the SHANTI KMap Solr Index?* Check this if you want to publish your content for use by other sites, such as the Subjects and Places explorers described above. 
  6. *KMaps Solr Server*. The URL to the SHANTI KMap index. Note that this URL may need to include a path to the specific index. The current default value is "http://kidx.shanti.virginia.edu/solr/kmindex".
7. Add a field of type **KMap Term** to a content type.
  1. Choose a widget type.
  2. Under Field Settings, choose the KMap domain -- subjects or places -- to be associatd with this field wherever it is used.
  3. Don't worry about "Number of vaules" under Field Settings if you chose the **Tree** widget type.
  3. Under the Field instance settings (under the "Edit" tab), optionally add a "KMap ID View." This is a local Drupal path for a view that needs to be created with which to search for nodes of this content type by KMap ID. This value is used by the popover field formatter. Use __KMAPID__ to signify the KMap ID value in the path.
8. In choose a field formatter, under Manage Display, don't choose **popover with link options** unless you are using a SHANTI Sarvaka theme. 
9. Create a node of the content type associated with the field type. 
10. If you are using the **Tree** widget, enter a search string into the text field and click on the "Search" button. If you see a KMap term you want associated with your node, click on it and it will appear in the list of associated terms below the tree. You can add as many terms as you'd like. You may delete terms from the list by clicking on the "X". 
