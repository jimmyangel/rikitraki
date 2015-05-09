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
	// Get trackId for use later
	console.log(tmConfig.getTrackId());

	map = new L.map('map');
	map.setMaxBounds([[-47.437951, 164.888817],[-33.900762, 179.984031]]);
	var layerControl =L.control.layers(null, null, {position: 'topleft', collapsed: true}).addTo(map);

	// Populate layers from JSON config file
	tmConfig.getLayersF(function(data) {
		console.log(status);

		var layerArray = data.layers;

		// Iterate through list of base layers and add to layer control
		for (var k=0; k<layerArray.length; k++) {
			var bl = new L.TileLayer(layerArray[k].layerUrl, {minZoom: 6, maxZoom: 17, attribution: layerArray[k].attribution, ext: 'png'});
			layerControl.addBaseLayer(bl, layerArray[k].layerName);
			// First layer is the one displayed by default
			if (k === 0) {
				map.addLayer(bl);
			}
		}
	});

	// Photo icon placement coordinates
	var photoPos = [
		[[-41.022, 173.028169], 'Split Apple'],
		[[-40.97, 173.067], 'Adele Island'],
		[[-40.942298, 173.067], 'Anchorage Bay from Pitt Head'],
		[[-40.961223, 173.077], 'Vegetation along the trail'],
		[[-40.952213, 173.077], 'Te Pukatea Bay'],
		[[-40.960737, 173.037], 'Anchorage Bay from the highest point of the trail'],
		[[-40.969911, 173.035], 'One of the many beautiful beaches along the trail'],
		[[-40.976724, 173.031], 'Stillwell Bay'],
		[[-40.984823, 173.017401], 'Low Tide at Sandy Bay'],
		[[-40.997, 173.018], 'Sandy Bay']
	];

	// Add geocoder to map
	// var geocoder = L.Control.geocoder({position: "topleft"}).addTo(map);
	// Do not add a marker, just center on the location
	// geocoder.markGeocode = function(result) {map.fitBounds(result.bbox) };

	// Add GPX track 1 (Water Taxi)

	// Overrride default color for GPX track
	var customLayer = L.geoJson(null, {
	    style: function() {
	        return { color: '#2c7bb6' };
	    }
	});

	/* var trackLayer = omnivore.gpx('data/tracks/AbelTasmanWaterTaxi.GPX', null, customLayer).on('ready', function() {
        map.fitBounds(trackLayer.getBounds());
        var trackLatLngs = trackLayer.getLayers()[0].getLatLngs();
        var icon = L.MakiMarkers.icon({icon: 'ferry', color: '#174A75', size: 'm'});
        var marker = L.marker(trackLatLngs[0], {icon: icon}).addTo(map);
        marker.bindPopup('<b>Water Taxi</b><br>Transportation service used to reach the trailhead', {maxWidth: 200});
        layerControl.addOverlay(trackLayer, 'Show water taxi route');
	}).addTo(map); */
 
	// Add GPX track 2 (Hike)
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
	customLayer = L.geoJson(null, {
	    style: function() {
	        return { color: '#A52A2A' };
	    }
	});

	var tl = omnivore.gpx('data/tracks/AbelTasman.GPX', null, customLayer).on('ready', function() {
    	map.fitBounds(tl.getBounds());
    	var tLatLngs = tl.getLayers()[0].getLatLngs();
        var icon = L.MakiMarkers.icon({icon: 'pitch', color: '#A52A2A', size: 'm'});
        var marker = L.marker(tLatLngs[0], {icon: icon}).addTo(map);
        marker.bindPopup('<b>Hiking Trail</b><br>Start: Anchorage Bay<br>End: Marahau<br>Length: 17.5km<br>Max elevation gain: 127m', {maxWidth: 200});
        L.geoJson(tl.toGeoJSON(),{
	    	onEachFeature: el.addData.bind(el)
		});
	}).addTo(map);

	// var photoLayerGroup = L.layerGroup();
	var photoLayerGroup = new L.MarkerClusterGroup();

	for (var k=0; k<photoPos.length; k++) {
		var img ='<a class="gallery" href="data/photos/pic' + (k+1) + '.jpg" ' + 'data-lightbox="image-' + (k+1) + '" data-title="' + photoPos[k][1] + '" ><img src="data/photos/thumb' + (k+1) + '.jpg" width="40" height="40"/></a>';
		var photoMarker = L.marker(photoPos[k][0], {
			clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
			icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
		});

		photoLayerGroup.addLayer(photoMarker);

	}

	photoLayerGroup.addTo(map);

	layerControl.addOverlay(photoLayerGroup, 'Show photos');


	// Add popup to the track
	tl.bindPopup('<b>Abel Tasman Coast Track</b><br><a href="http://en.wikipedia.org/wiki/Abel_Tasman_Coast_Track" target="_blank"> <img src="http://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/AbelTasmanBeach.jpg/320px-AbelTasmanBeach.jpg" width="200"/></a>', {maxWidth: 200});

	// Add scale
	L.control.scale({position: 'topright'}).addTo(map);

	// Add legend
	var legend = L.control({position: 'bottomright'});
	legend.onAdd = function () {
		document.getElementById('legend').style.display = 'inline';
		return L.DomUtil.get('legend');
	};
	legend.addTo(map); 
}

window.onload = initmap;