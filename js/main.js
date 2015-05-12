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

// Example for learning to use Leaflet and various map tile servers

var map;

function initmap() {
	// Get trackId from URL query string
	// TODO: no query string will default to all track markers
	var trackId = tmConfig.getTrackId();

	map = new L.map('map');

	// Set up layer control
	var layerControl =L.control.layers(null, null, {position: 'topleft', collapsed: true}).addTo(map);

	// Populate basemap layers from JSON config file
	tmConfig.getLayers(function(data) {
		console.log(status);

		var layerArray = data.layers;

		// Iterate through list of base layers and add to layer control
		for (var k=0; k<layerArray.length; k++) {
			var bl = new L.TileLayer(layerArray[k].layerUrl, {minZoom: 1, maxZoom: 17, attribution: layerArray[k].attribution, ext: 'png'});
			layerControl.addBaseLayer(bl, layerArray[k].layerName);
			// First layer is the one displayed by default
			if (k === 0) {
				map.addLayer(bl);
			}
		}
	});

	// Add scale
	L.control.scale({position: 'topright'}).addTo(map);


	// Get track data and wait before populating info onto the map
	var trackInfo;
	tmData.getTrackInfo(function(data) {
		trackInfo = data.tracks;
		console.log(trackInfo);

		// Populate the map

		if (!(trackId in trackInfo)) {
			// Add all tracks markers to map
			console.log("show all tracks");
			map.setView([45.52, -122.6819], 3);
		} else {

			// Add just the one GPX track 

			// Create the elevation control first
			var el = L.control.elevation({
				position: 'bottomleft',
				theme: 'steelblue-theme',
				width: 400,
				height: 125,
				collapsed: true
			});
			el.addTo(map);

			// Overrride default color for GPX track
			var customLayer = L.geoJson(null, {
			    style: function() {
			        return { color: '#A52A2A' };
			    }
			});

			var tl = omnivore.gpx('data/' + trackId + '/gpx/' + trackInfo[trackId].trackGPX, null, customLayer).on('ready', function() {
		    	map.fitBounds(tl.getBounds());
		    	var tLatLngs = tl.getLayers()[0].getLatLngs();
		        var icon = L.MakiMarkers.icon({icon: 'pitch', color: '#A52A2A', size: 'm'});
		        var marker = L.marker(tLatLngs[0], {icon: icon}).addTo(map);
		        marker.bindPopup(trackInfo[trackId].trackHeadPopUp, {maxWidth: 200});
		        try {
		        	L.geoJson(tl.toGeoJSON(), {onEachFeature: el.addData.bind(el)});
		        } catch (err) {} // Leaflet Elevation is throwing errors at point features, which is really not an error
			}).addTo(map);

			// var photoLayerGroup = L.layerGroup();
			var photoLayerGroup = new L.MarkerClusterGroup({spiderfyDistanceMultiplier: 5});

			for (var k=0; k<trackInfo[trackId].trackPhotos.length; k++) {
				var img ='<a class="gallery" href="data/' + trackId + '/photos/' + trackInfo[trackId].trackPhotos[k].picName + 
						 '" data-lightbox="image-' + (k+1) + '" data-title="' + trackInfo[trackId].trackPhotos[k].picCaption +
						 '" ><img src="data/' + trackId + '/photos/' + trackInfo[trackId].trackPhotos[k].picThumb + '" width="40" height="40"/></a>';
				var photoMarker = L.marker(trackInfo[trackId].trackPhotos[k].picLatLng, {
					clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
					icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
				});

				photoLayerGroup.addLayer(photoMarker);
			}

			photoLayerGroup.addTo(map);

			layerControl.addOverlay(photoLayerGroup, 'Show photos');

			// Add popup to the track
			tl.bindPopup(trackInfo[trackId].trackPopUp, {maxWidth: 200});

			// Add legend
			var legend = L.control({position: 'bottomright'});
			legend.onAdd = function () {
				document.getElementById('legend').style.display = 'inline';
				return L.DomUtil.get('legend');
			};
			legend.addTo(map); 
		}
	});	
}

window.onload = initmap;