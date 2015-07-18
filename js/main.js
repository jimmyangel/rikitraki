'use strict';

// The below is to stop jshint barking at undefined variables
/* globals tmConfig, tmMap, tmData */
/* exported map, isMobile */

// The map is global
var map;
var isMobile = tmConfig.getMobileOverride() ? false : /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

function setUpMap() {
	// alert(navigator.userAgent);

	// Get trackId from URL query string
	var trackId = tmConfig.getTrackId();

	// Get track data and wait before populating info onto the map
	tmData.getTrackInfo(function(data) {
		// Set up common bootstrap stuff and get the regions
		var regions = tmMap.setUpCommon(data.tracks);

		// Now figure out what view to set up
		if (tmConfig.getTerrainFlag() && (trackId in data.tracks)) {
			tmMap.setUpSingleTrackTerrainView(data.tracks[trackId]);		
		} else {
			if (tmConfig.getGlobeFlag() && !isMobile) {
				tmMap.setUpGlobe(data.tracks, regions);
			} else {
				// Get JSON layer config file and wait before populating map
				tmConfig.getLayers(function(l) {
					// Set up map and get layer control which we will need later on
					var layerControl = tmMap.setUpMap(l);
					// If we do not have a (valid) track id in the query parameter, then go for all tracks
					if (!(trackId in data.tracks)) {
						// Since trackId not found then add all tracks markers to map and display all
						// But first lets see if we need to zoom into a region
						var regionParm = tmConfig.getRegion();
						tmMap.setUpAllTracksView(data.tracks, regions[regionParm]);
					// Otherwise, go for a single track and its gory details
					} else {
						tmMap.setUpSingleTrackView(data.tracks[trackId], layerControl, data.tracks);
					}
				});
			}
		}
	});	
}

window.onload = setUpMap; // Ok, set up the map