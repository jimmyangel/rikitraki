'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmConfig */

var tmMap = {
	setUpCommon: function () {
		// Add layer control
		var layerControl = L.control.layers(null, null, {position: 'topleft', collapsed: true}).addTo(map);

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

		return layerControl; // We will need this later
	},
	setUpAllTracksView: function(tracks) {
		map.setView([45.52, -122.6819], 3);

		var trackMarkersLayerGroup = L.featureGroup();

		for (let tId in tracks) {
			let m = L.marker(tracks[tId].trackLatLng);
			trackMarkersLayerGroup.addLayer(m);
			m.on('click', function () {
				window.open('/' + '?track=' + tId, '_self');
			}

			)
			console.log(tId);
		}
		map.fitBounds(trackMarkersLayerGroup.getBounds());
		trackMarkersLayerGroup.addTo(map);
	},
	setUpSingleTrackView: function(track, layerControl) {
		// Create the elevation control first
		var el = L.control.elevation({
			position: 'bottomleft',
			theme: 'steelblue-theme',
			width: 400,
			height: 125,
			collapsed: true
		});
		el.addTo(map);	


		// Use a custom layer to bind elevation control via onEachFeature
		var customLayer = L.geoJson(null, {
		    style: function() {
		        return { color: '#A52A2A' };
		    },
		    onEachFeature: function (feature, layer) {
		    	try {
		 			el.addData.bind(el)(feature, layer);
		    	} catch (err) {} // Control.Elevation does not seem to like waypoints so ignore the exception
		    }
		});

		// Use omnivore to get gpx track data and put it on the map
		var tl = omnivore.gpx('data/' + track.trackId + '/gpx/' + track.trackGPX, null, customLayer).on('ready', function() {
	    	map.fitBounds(tl.getBounds());
	    	let tLatLngs = tl.getLayers()[0].getLatLngs();
	        var icon = L.MakiMarkers.icon({icon: 'pitch', color: '#A52A2A', size: 'm'});
	        var marker = L.marker(tLatLngs[0], {icon: icon}).addTo(map);
	        marker.bindPopup(track.trackHeadPopUp, {maxWidth: 200});
		}).addTo(map);

		// Populate photo makers
		var photoLayerGroup = L.layerGroup();
		$.lightbox.options.wrapAround = true; // Tell lightbox to do a wraparound album (this depends on a small modification to Lightbox)

		// Go get the geo tags and then put the pics on the map
		tmData.getGeoTags(track.trackId, function(data) {
			for (var k=0; k<data.geoTags.trackPhotos.length; k++) {
				var img ='<a href="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picName + 
						 '" data-lightbox="picture" data-title="' + data.geoTags.trackPhotos[k].picCaption +
						 '" ><img src="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picThumb + '" width="40" height="40"/></a>';
				var photoMarker = L.marker(data.geoTags.trackPhotos[k].picLatLng, {
					clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
					icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
				});
				photoLayerGroup.addLayer(photoMarker);
			}
			photoLayerGroup.addTo(map);

			layerControl.addOverlay(photoLayerGroup, 'Show photos');
		});

		// Add popup to the track
		tl.bindPopup(track.trackPopUp, {maxWidth: 200});

		// Add legend (TODO: change to track info)
		var legend = L.control({position: 'bottomright'});
		legend.onAdd = function () {
			document.getElementById('legend').style.display = 'inline';
			return L.DomUtil.get('legend');
		};
		legend.addTo(map); 
	}
};