<?php

/**
 * @file shanti_kmaps_fields.kmaps_api.inc
 */

/**
 * Simple class for putting together a URL for the API call, and doing an HTTP request
 * for retrieving information about KMaps.
 * All public methods return $this and can be chained together, except the execute(),
 * which returns the response data.
 * 
 * TO ADD:
 * -- Search context,i.e. which branch one is browsing. This should have
 * a site-wide default mode as well as a content-type specific override. 
 * -- JSONP on/off setting
 * -- Search scope setting (i.e. if labels or also descriptions, etc.)
 * -- Adapt to newer API
 * 
 * NEEDED FROM ANDRES:
 * -- A flat result list with parent identified (i.e. add element to list results)
 * -- A more complete item for name searches; i.e. with ancestors
 * -- A CSV API
 */
 

class KMapsAPI {
    
  private $server             = ''; // set in constructor; the base URL to the server
  private $server_stem        = ''; // set in constructor; the stem path of the URL to the server
  private $domain             = ''; // set in constructor; 'subjects' or 'places'
  private $api_url            = ''; // set in constructor; the appended URL to the server
  private $debug_mode         = 0; // or 1
  private $arguments          = array(); // URL arguments for string searches
  private $kmap_string        = '';   
  private $kmap_ids           = array();
  private $kmap_id            = 0;
  private $parse_mode         = 'autocomplete'; // or 'raw'
  private $fetch_mode         = 'by_name';   // or 'by_fid' or 'by_fid_cached'
  private $results_format     = 'json'; // or 'xml'
  private $results_page       = '1'; // page number of results
  private $results_per_page   = '100'; // the count of results per page
  private $results_scope      = 'names';  // Also 'full_text' 
  private $results_view_code  = 'roman.popular'; // the view code that the features' information should be returned in (e.g. "roman.popular")

  public function __construct($domain = 'subjects', $server = 'http://subjects.kmaps.virginia.edu', $server_stem = '/features') {
    $this->domain       = $domain;
    $this->server       = $server;
    $this->server_stem  = $server_stem;
    $this->api_url      = $this->server . $this->server_stem;
    $this->debug_mode   = variable_get('shanti_kmaps_fields_debug_mode',0);
    return $this;
  }
  
  public function setString($string) {
    $this->setFetchModeToName();
    $this->kmap_string = $string;
    return $this;
  }
  
  public function setKMapID($kmap_id) {
    // Check if integer!
    $this->setFetchModeToIDCached();
    $this->kmap_id = $kmap_id;
    return $this;
  }
  
  public function pushKMapIDs($kmap_id) {
    $this->kmap_ids[] = $kmap_id;
    return $this;
  }
  
  public function addArgument($key, $value) {
    $this->arguments[$key] = $value;
    return $this;
  }
    
  public function setFormatToJSON() {
    $this->results_format = 'json';
    return $this;
  }

  public function setFormatToXML() {
    $this->results_format = 'xml';
    return $this;
  }
  
  public function setParseModeToAutocomplete() {
    $this->parse_mode = 'autocomplete';
    return $this;
  }

  public function setParseModeToRaw() {
    $this->parse_mode = 'raw';
    return $this;
  }
  
  public function setFetchModeToName() {
    $this->fetch_mode = 'by_name';
    return $this;
  }

  // Set to private?
  private function setFetchModeToID() {
    $this->fetch_mode = 'by_fid';
    return $this;
  }

  // Set to private?
  private function setFetchModeToIDCached() {
    $this->fetch_mode = 'by_fid_cached';
    return $this;
  }

  // GETTERS (these don't return the object)
  
  public function getURL() {
    return $this->api_url;
  }
  
  public function getKMapIDsString($delim = ',') {
    return implode($delim, $this->kmap_ids);
  }
  
  // INTERNAL UTILS

  /*
  // Only works with places ...
  public function setFetchModeToTopic() {
    if ($this->domain == 'places') {
      $this->fetch_mode = 'by_topic';
      return $this;
    }
    return FALSE;
  }

  // Only works with places ...
  public function setFetchModeToGeocode() {
    if ($this->domain == 'places') {
      $this->fetch_mode = 'by_geo_code';
      return $this;      
    }
    return FALSE;
  }
  */ 

  /**
   * Executes the request. Returns the response data. This is going
   * to be overridden by more specific requests (see below).
   */
  public function execute() {
    $raw_url = $this->api_url;
    
    // Build the base URL for each fetch mode
    if ($this->fetch_mode == 'by_name') {
      $raw_url .= '/by_name/' . $this->kmap_string . '.' . $this->results_format;
    } elseif ($this->fetch_mode == 'by_fid') {
      $kmap_id_string = implode(',',$this->kmap_ids);
      $raw_url .= '/by_fid/' . $kmap_id_string . '.' . $this->results_format;
    } elseif ($this->fetch_mode == 'by_fid_cached') {
      $raw_url .= '/' . $this->kmap_id . '.' . $this->results_format;
    } else {
      // Anomalous; do nothing for now. Or define a default.
    }

    // Let Drupal construct the full URL
    $options = array();
    $options['absolute'] = TRUE;
    $options['query'] = $this->arguments; // APPLIES ONLY IF STRING SEARCH
    $request_url = url($raw_url, $options);
    if ($this->debug_mode) {
      drupal_set_message(t('Request URL: !url', array('!url' => urldecode($request_url))));
    }
    
    // Pass the URL to the request method
    return $this->request($request_url);
  }

  /**
   * Actual HTTP request.
   */
  private function request($request_url) {
    $response = drupal_http_request($request_url);
    if ($response->code != 200) {
      watchdog('shanti_kmaps_utils', 'HTTP error !code received.', array('!code' => $response->code), WATCHDOG_ERROR);
      return FALSE;
    }
    $data = json_decode($response->data);
    if (!is_object($data)) {
      watchdog('shanti_kmaps_utils', 'Did not receive valid API response (invalid JSON).', array(), WATCHDOG_ERROR);
      return FALSE;
    }
    if (isset($data->error)) {
      watchdog('shanti_kmaps_utils', 'Error !code received: %message', array('!code' => $data->error, '%message' => $data->message), WATCHDOG_ERROR);
      return FALSE;
    }
    
    // Parse the data before returning
    return $this->parse($data);
  }

  /**
   * Parses the response data. Return format depends on parse_mode and fetch_mode, since
   * fetch_modes may return slightly different JSON structures :( 
   */
  private function parse($data) {
    $parsed_data = array();
    // Autocomplete expexts a simple id/label hash that will be converted to JSON
    if ($this->parse_mode == 'autocomplete') {
      if ($this->fetch_mode == 'by_name') {
        foreach ($data->features as $item) {
          $parsed_data[$item->id] = $item->header;
        }        
      } 
      elseif ($this->fetch_mode == 'by_fid') {
        foreach ($data->features as $item) {
          $parsed_data[$item->id] = $item->header;
          // Add othe stuff too
        }                
      } 
      elseif ($this->fetch_mode == 'by_fid_cached') {
        // We append an ancestor path to provide context for the item
        $ancestors = array();
        foreach ($data->feature->ancestors as $ancestor) { $ancestors[] = $ancestor->header; }
        array_pop($ancestors); // Remove the last ancestor, which is the current item
        $parsed_data[$data->feature->id] = $data->feature->header . ' | ' . implode('/', $ancestors); 
      }    
    // Raw mode is for other purposes
    } 
    elseif ($this->parse_mode == 'raw') {
      $parsed_data = $data;
    } 
    else {
      // Do nothing for now.
    }
    
    return $parsed_data;
  }
  
  // SPECIFIC REQUESTS -- Not sure if these should be written here or in code that uses this Class
  
  public function searchByName($search_string) { 
    $this->setString($search_string);
    $this->addArgument('per_page', $this->results_per_page);
    $this->setFetchModeToName();
    $this->setFormatToJSON();
    $this->setParseModeToAutocomplete();
    $parsed_data = $this->execute();
    // When multiple IDs are fixed, then use the kmap_ids function and call non-cache URL
    $result = array();
    $this->setFetchModeToIDCached(); // Now switch to fetching each ID
    foreach ($parsed_data as $kmap_id => $kmap_label) {
      $r = $this->setKMapID($kmap_id)->execute();
      $key = "$kmap_id | {$r[$kmap_id]}"; // Not sure if it's best to do this here
      $result[$key] = $r[$kmap_id];
    }
    return $result;
  }
  
  public function searchByNameGetGraph($search_string) { 
    $this->setString($search_string);
    $this->addArgument('per_page', $this->results_per_page);
    $this->setFetchModeToName();
    $this->setFormatToJSON();
    $this->setParseModeToRaw();
    $rs1 = $this->execute();

    // When multiple IDs are fixed, then use the kmap_ids function and call non-cache URL    

    $this->setFetchModeToIDCached(); // Now switch to fetching each ID
    $G = array();    
    for ($i = 0; $i < count($rs1->features); $i++) {
    	$x = $rs1->features[$i]->id;
    	$y = $rs1->features[$i]->header;
			$G['nodes'][$x] = $y;			
			$rs2 = $this->setKMapID($x)->execute();
    	$max_j = count($rs2->feature->ancestors) - 1;
			for ($j = 0; $j <= $max_j; $j++) {
				$m = $rs2->feature->ancestors[$j]->id;
				$n = $rs2->feature->ancestors[$j]->header;
				$G['nodes'][$m] = $n;
				if ($j > 0) {
					$o = $rs2->feature->ancestors[$j-1]->id;
					if (!$G['edges'][$m][$o]) $G['edges'][$o][$m]++;
				}
			}
			
    }    
    return $G;
  }

  public function searchByNameGetTree($search_string) { 

		// Set the parameters for the object  
    $this->setString($search_string);
    //$this->addArgument('per_page', $this->results_per_page); // May need to send this
    $this->addArgument('per_page', 10000); // May need to send this
    $this->setFetchModeToName();
    $this->setFormatToJSON();
    $this->setParseModeToRaw();
    
    // Run the query
    $rs1 = $this->execute();

		// For each item, run another query to get more information
    // When multiple IDs are fixed, then use the kmap_ids function and call non-cache URL    
    $this->setFetchModeToIDCached(); 
    $paths = array();    
    #$nodes = array();
    for ($i = 0; $i < count($rs1->features); $i++) {
    	$id = $rs1->features[$i]->id;
			$rs2 = $this->setKMapID($id)->execute();
			$path = array();
			for ($j = 0; $j < count($rs2->feature->ancestors); $j++) {
				$m = $rs2->feature->ancestors[$j]->id;
				$n = $rs2->feature->ancestors[$j]->header;
				#$nodes[$m] = $n;
				$path[] = "$n F$m";
			}
			$paths[] = implode('|', $path);
    }   
    sort($paths);
    
    $tree = array();
		foreach ($paths as $path) {
    	$pathParts = explode('|', $path);
    	$x = array_pop($pathParts);
    	$subTree = array($x); // DEFAULT
    	foreach (array_reverse($pathParts) as $dir) {
        $subTree = array($dir => $subTree); // DEFAULT
    	}
    	$tree = array_merge_recursive($tree, $subTree);
		}
    return $tree;
    
  }

  public function searchByNameGetList($search_string) { 
		
		$t1 = microtime();
		
		// Set the parameters for the object  
    $this->setString($search_string);
    //$this->addArgument('per_page', $this->results_per_page); // May need to send this
    $this->addArgument('per_page', 10000); // May need to send this
    $this->setFetchModeToName();
    $this->setFormatToJSON();
    $this->setParseModeToRaw();
    
    // Run the query
    $rs1 = $this->execute();

		// For each item, run another query to get more information
    // When multiple IDs are fixed, then use the kmap_ids function and call non-cache URL    

    $this->setFetchModeToIDCached(); 
    $list = array('meta' => array(), 'data' => array(), 'dict' => array());
    $result_count = count($rs1->features);
		$list['meta']['count'] = $result_count;
		$list['meta']['search'] = $search_string;
    for ($i = 0; $i < $result_count; $i++) {
    	$id 		= $rs1->features[$i]->id;
    	$header = $rs1->features[$i]->header;    
			$rs2 		= $this->setKMapID($id)->execute();
			$list['data'][] = array(
				'id' => $id,
				'header' => $header,
				'ancestors' => $rs2->feature->ancestors,				
			);
			$list['dict'][$id]['header'] = $header;
			$list['dict'][$id]['ancestors'] = $rs2->feature->ancestors;
		}
		
		$t2 = microtime();
		$t3 = ($t2 - $t1) * 1000;
		$list['t'] = $t3;
		// BENCHMARK = t: 287.624
    return $list;    
  }

  public function searchByNameGetListUncached($search_string) { 
		
		$t1 = microtime();
		
		// Set the parameters for the object  
    $this->setString($search_string);
    $this->addArgument('per_page', 10000); // May need to send this
    $this->setFetchModeToName();
    $this->setFormatToJSON();
    $this->setParseModeToRaw();
    
    // Run the query
    $rs1 = $this->execute();
		$result_count = count($rs1->features);
    for ($i = 0; $i < $result_count; $i++) {
    	$id = $rs1->features[$i]->id;
    	$this->pushKMapIDs($id);
    }

    $list = array('meta' => array(), 'data' => array(), 'dict' => array());
		$list['meta']['count'] = $result_count;
		$list['meta']['search'] = $search_string;
    $this->setFetchModeToID(); 
		$rs2 = $this->execute();
		foreach ($rs2->features as $f) {
			$list['data'][] = array(
				'header' 		=> $f->header,
				'id' 				=> $f->id,
				'ancestors' => $f->ancestors,
			);
			$list['dict'][$f->id]['header'] 		= $f->header;
			$list['dict'][$f->id]['ancestors'] 	= $f->ancestors;
		}
		
		$t2 = microtime();
		$t3 = ($t2 - $t1) * 1000;
		$list['t'] = $t3;
    return $list;    
  }
  
}
