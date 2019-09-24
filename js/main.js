'use strict';
var jquery = require('jquery');
window.$ = window.jQuery = jquery;

require('bootstrap');
require('stupid-table-plugin');
require('spin.js');
require('spin.js/jquery.spin.js');

import {tmConfig, tmEmptyDBTracks} from './config.js';
import {tmData} from './data.js';
import {tmMap} from './mapper.js';

// Globals (fix later)
window.API_BASE_URL = tmConfig.getApiBaseUrl();
window.CESIUM_BASE_URL = 'lib/Cesium/';

window.isMobile = tmConfig.getOverride() ? false : /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
window.isWebGlSupported = false;

$('#loadingSpinner').spin();

// Turn off ajax caching for IE
$.ajaxSetup({cache: !(/MSIE|Trident|Edge/i.test(navigator.userAgent))});

function setUpMap() {
	isWebGlSupported = tmConfig.getOverride() ? true : tmConfig.getWebGlFlag();

	// Get trackId from URL query string
	var trackId = tmConfig.getTrackId();

	// Get track data and wait before populating info onto the map
	tmData.getTrackInfo(function(data) {

    // Suppprt empty database
    if (data === undefined) {
      console.log('Warning: database appears to be empty');
      data = tmEmptyDBTracks;
    }
		// Set up common bootstrap stuff and get the regions
		var regions = tmMap.setUpCommon(data.tracks);

		// Now figure out what view to set up
		if ((tmConfig.getTerrainFlag() || tmConfig.getGlobeFlag()) && isWebGlSupported) {
			$.getScript('lib/Cesium/Cesium.js', function () {
				tmMap.setUp3DView(data.tracks, (trackId in data.tracks) ? data.tracks[trackId] : undefined);
			});
		} else {
			// Get JSON layer config file and wait before populating map
			// Set up map and get layer control which we will need later on
			var layerControl = tmMap.setUpMap();
			// If we do not have a (valid) track id in the query parameter, then go for all tracks
			if (!(trackId in data.tracks)) {
				// Since trackId not found then add all tracks markers to map and display all
				// But first lets see if we need to zoom into a region
				var regionParm = tmConfig.getRegion();
				tmMap.setUpAllTracksView(data.tracks, regions[regionParm], layerControl);
			// Otherwise, go for a single track and its gory details
			} else {
				tmMap.setUpSingleTrackView(data.tracks[trackId], data.tracks, layerControl);
			}
		}
	});
}

window.onload = setUpMap; // Ok, set up the map
