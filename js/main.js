'use strict';

// The below is to stop jshint barking at undefined variables
/* globals L, tmConfig, tmMap, tmData */

// Handle the about box
$('#about-btn').click(function() {
  $('#aboutModal').modal('show');
  // $(".navbar-collapse.in").collapse("hide");
  return false;
});

// The map is global
var map;

// Set up map only after the DOM is ready
function setUpMap() {
	// Get trackId from URL query string
	var trackId = tmConfig.getTrackId();

	map = new L.map('map');

	// Set up common stuff and return layer control which we will need later on
	var layerControl = tmMap.setUpCommon();

	// Get track data and wait before populating info onto the map
	tmData.getTrackInfo(function(data) {

		// Set up goto menu and grab regions data structure
		var regions = tmMap.setUpGotoMenu(data.tracks);

		// If we do not have a (valid) track id in the query parameter, then go for all tracks
		if (!(trackId in data.tracks)) {
			// Since trackId not found then add all tracks markers to map and display all
			// But first lets see if we need to zoom into a region
			var regionParm = tmConfig.getRegion();
			tmMap.setUpAllTracksView(data.tracks, regions[regionParm]);
		// Otherwise, go for a single track and its gory details
		} else {
			tmMap.setUpSingleTrackView(data.tracks[trackId], layerControl);
		}
	});	
}

window.onload = setUpMap; // Ok, set up the map