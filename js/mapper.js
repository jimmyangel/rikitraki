'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmConfig */
var TRAIL_MARKER_COLOR = '#A52A2A';
var WAYPOINT_COLOR = '#3887BE';
var TRACK_COLOR = '#A52A2A';
var FAVORITE = '&#10025;';

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

		var trackMarkersLayerGroup = new L.MarkerClusterGroup();

		for (var tId in tracks) {
			var m = L.marker(tracks[tId].trackLatLng, {icon: L.MakiMarkers.icon({icon: 'pitch', color: TRAIL_MARKER_COLOR, size: 'm'})});
			m.bindPopup('<a href="/?track=' + tId + '">' + tracks[tId].trackName) + '</a';
			trackMarkersLayerGroup.addLayer(m);
		}
		map.fitBounds(trackMarkersLayerGroup.getBounds());
		trackMarkersLayerGroup.addTo(map);
	},
	setUpSingleTrackView: function(track, layerControl) {
		var trackMetrics;
		// Create the elevation control first
		var el = L.control.elevation({
			position: 'bottomleft',
			theme: 'steelblue-theme',
			width: 400,
			height: 125,
			collapsed: true
		});
		el.addTo(map);	

		// We use a custom layer to have more control over track display
		var customLayer = L.geoJson(null, {
			// Set the track color
		    style: function() {
		        return {color: TRACK_COLOR};
		    },
		    // Bind elevation control via onEachFeature
		    onEachFeature: function (feature, layer) {
		    	try {
		 			el.addData.bind(el)(feature, layer);
		    	} catch (err) {} // Control.Elevation does not seem to like waypoints so ignore the exception for now
		    }
		});

		// Get gpx track data and put it on the map
		var tl = omnivore.gpx('data/' + track.trackId + '/gpx/' + track.trackGPX, null, customLayer).on('ready', function(layer) {
			// Change the default icon for waypoints
	        var wpIcon = L.MakiMarkers.icon({icon: 'embassy', color: WAYPOINT_COLOR, size: 's'});
	        // Now let's customize the popups
			this.eachLayer(function (layer) {
				layer.bindPopup(layer.feature.properties.name, {maxWidth: 200});
				// Hey since we are iterating through features, we may as well get the track distance and elevation gain
				if (layer.feature.geometry.type === 'LineString') {
					trackMetrics = tmUtils.calculateTrackMetrics(layer.feature);
				}
				// Set the icon for Point markers
		    	if (layer.feature.geometry.type == 'Point'){
		    		layer.setIcon(wpIcon);
		    	}
			});
			// Fit th map to the trail boundaries
	    	map.fitBounds(tl.getBounds());
	    	// Set up trailhead marker assuming the very first point is at the trailhead
	    	var tLatLngs = tl.getLayers()[0].getLatLngs();
	        var trailIcon = L.MakiMarkers.icon({icon: 'pitch', color: TRAIL_MARKER_COLOR, size: 'm'});
	        var marker = L.marker(tLatLngs[0], {icon: trailIcon}).addTo(map);
	        marker.bindPopup('Trailhead');
			// Add track info control
			var legend = L.control({position: 'bottomright'});
			legend.onAdd = function () {
				var container = L.DomUtil.create('div', 'legend-container');
				container.innerHTML = '<a id="trackinfo-btn" href="#"><img src="images/trackinfo.png"/></a>';
				return container;
			};
			legend.addTo(map); 

			// Populate track info dialog and set up click handler
			var fav = '';
			if (track.trackFav) {
				fav = FAVORITE;
			}
			$('#trackInfoTitle').append(track.trackName + ' ' + fav);
			$('#trackInfoBody').append( '<b>' + track.trackLevel + '</b><br>' + 
										' <b>Length:</b> ' + trackMetrics[0] + 'km - <b>Elevation Gain:</b> ' + trackMetrics[1] + 'm' + 
										' <b>Max Elevation:</b> ' + trackMetrics[2] + 'm' + 
										' <b>Min Elevation:</b> ' + trackMetrics[3] + 'm' +
										'<br><b>Region:</b> ' + track.trackRegionTags + '<hr>' +
										track.trackDescription);

			$('#trackinfo-btn').click(function() {
			  $('#trackInfoModal').modal('show');
			  // Stop propagating scroll events to the map
			  $('#trackInfoModal').bind('mousedown wheel scrollstart touchstart', function(e) {L.DomEvent.stopPropagation(e);});
			  return false;
			});      
		}).addTo(map);

		// Populate photo makers
		if (track.hasPhotos) {
			$.lightbox.options.wrapAround = true; // Tell lightbox to do a wraparound album (this depends on a small modification to Lightbox)
			// Go get the geo tags and then put the pics on the map
			tmData.getGeoTags(track.trackId, function(data) {
				var slideshow = L.control({position: 'bottomright'});
				// Add slideshow thinghy and also pics to the track if they are geotagged
				slideshow.onAdd = function () {
					var haveGeoTags = false;	 
					var displayNone = '';
					var photoLayerGroup = L.layerGroup();

					for (var k=0; k<data.geoTags.trackPhotos.length; k++) {
						// Only the first item is shown as a camera icon, the others are for lightbox to pick up
						if (k === 1) {
							displayNone = ' style="display: none;"'
						}
						var slideShowControlHTML = '<a href="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picName +
											  '" data-lightbox="slideshow" data-title="' + data.geoTags.trackPhotos[k].picCaption + '"' + 
											  displayNone + '><img src="images/photos.png"/></a>'
						$('#slideShowContainer').append(slideShowControlHTML);

						// If we have geotags, go ahead and place them on thumbnail photo markers
						if (data.geoTags.trackPhotos[k].picLatLng) {
							haveGeoTags = true;
							var img ='<a href="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picName + 
									 '" data-lightbox="picture" data-title="' + data.geoTags.trackPhotos[k].picCaption +
									 '" ><img src="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picThumb + '" width="40" height="40"/></a>';
							var photoMarker = L.marker(data.geoTags.trackPhotos[k].picLatLng, {
								clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
								icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
							});
							photoLayerGroup.addLayer(photoMarker);
						}
					};
					// If we have geotagged pictures, add a layer control to show/hide them
					if (haveGeoTags) {
						photoLayerGroup.addTo(map);
						layerControl.addOverlay(photoLayerGroup, 'Show track photos');
					}
					// return container;
					return $('#slideShowContainer')[0];
				}
				slideshow.addTo(map);
			}, function(jqxhr, textStatus, error) {console.log(textStatus);}); // For now, ignore errors looking for the geotags files
		}
	}
};