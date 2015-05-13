'use strict';

// The below is to stop jshint barking at undefined variables
/* globals L, omnivore, tmConfig */

// console.log('\'Allo \'Allo!');


// Handle about box
$('#about-btn').click(function() {
  $('#aboutModal').modal('show');
  // $(".navbar-collapse.in").collapse("hide");
  return false;
});

// The map is global
var map;

// Set up map after the dom is ready
function setUpMap() {
	// Get trackId from URL query string
	var trackId = tmConfig.getTrackId();

	map = new L.map('map');

	// Set up layer control
	var layerControl = tmMap.setUpCommon();

	// Get track data and wait before populating info onto the map
	tmData.getTrackInfo(function(data) {
		console.log(data.tracks);

		// Populate the map

		if (!(trackId in data.tracks)) {
			// Since trackId not found then add all tracks markers to map and display all
			console.log("show all tracks");
			tmMap.setUpAllTracksView(data.tracks);
		} else {

			tmMap.setUpSingleTrackView(data.tracks[trackId], layerControl);
			// Populate photo makers
/*			var photoLayerGroup = L.layerGroup();
			$.lightbox.options.wrapAround = true; // Tell lightbox to do a wraparound album (this depends on a small modification to Lightbox)

			// Go get the geo tags and then put the pics on the map
			tmData.getGeoTags(trackId, function(data) {
				for (var k=0; k<data.geoTags.trackPhotos.length; k++) {
					var img ='<a href="data/' + trackId + '/photos/' + data.geoTags.trackPhotos[k].picName + 
							 '" data-lightbox="picture" data-title="' + data.geoTags.trackPhotos[k].picCaption +
							 '" ><img src="data/' + trackId + '/photos/' + data.geoTags.trackPhotos[k].picThumb + '" width="40" height="40"/></a>';
					var photoMarker = L.marker(data.geoTags.trackPhotos[k].picLatLng, {
						clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
						icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
					});
					photoLayerGroup.addLayer(photoMarker);
				}
				photoLayerGroup.addTo(map);

				layerControl.addOverlay(photoLayerGroup, 'Show photos');
			}); */
		}
	});	
}

window.onload = setUpMap;