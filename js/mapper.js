'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmMap */
/* globals L, omnivore, tmConfig, tmData, tmUtils, map */

var TRAIL_MARKER_COLOR = '#A52A2A';
var WAYPOINT_COLOR = '#3887BE';
var TRACK_COLOR = '#A52A2A';
var FAVORITE = '&#10029;';

var tmMap = {
	setUpCommon: function () {
		// Handle the about box
		$('#about-btn').click(function() {
		  $('#aboutModal').modal('show');
		  return false;
		});

		// Add layer control
		var layerControl = L.control.layers(null, null, {position: 'topleft', collapsed: true}).addTo(map);

		// Set up spinner control
		var spinnerControl = L.control({position: 'bottomright'});
		spinnerControl.onAdd = function () {
			var spinnerControlContainer = L.DomUtil.create('div', 'spinnerControlContainer');
			return spinnerControlContainer;
		};
		spinnerControl.addTo(map);

		// Set up spinner handler
		var spinHandler = function (e) {
			if (e.type === 'loading') {
				$('.spinnerControlContainer').spin();
			} else {
				$('.spinnerControlContainer').spin(false);
			}	
		}; 

		// Set up zoom check handler (so that we do not end up with more zoom than what is available)
		var baseLayerChangeHandler = function () {
			var maxZoom = map.getMaxZoom();
			if (map.getZoom() > maxZoom) {
				map.setZoom(maxZoom);
			}
		};
		map.on('baselayerchange', baseLayerChangeHandler);

		// Populate basemap layers from JSON config file
		tmConfig.getLayers(function(data) {
			var layerArray = data.layers;

			// Iterate through list of base layers and add to layer control
			for (var k=0; k<layerArray.length; k++) {
				var bl = L.tileLayer(layerArray[k].layerUrl, {minZoom: 1, maxZoom: layerArray[k].maxZoom, attribution: layerArray[k].attribution, ext: 'png'});
				layerControl.addBaseLayer(bl, layerArray[k].layerName);
				// Wire the spinner handlers
				bl.on('loading', spinHandler);
				bl.on('load', spinHandler);

				// First layer is the one displayed by default
				if (k === 0) {
					map.addLayer(bl);
				}
			}
		});

		// Add scale
		L.control.scale({position: 'bottomleft'}).addTo(map);
		return layerControl; // We will need this later
	},
	setUpTracksMenu: function (tracks) {
		// Populate tracks dialog box
		for (var tId in tracks) {
			$('#tracksTable').append('<tr><td>' + (tracks[tId].trackFav ? FAVORITE : '') + 
									'</td><td>' + tracks[tId].trackName + 
									'</td><td>' + tracks[tId].trackLevel + 
									'</td><td>' + tracks[tId].trackRegionTags + 
									'</td><td style="display:none">' + tId +
									'</td></tr>');
		}

		// Handle the search box
		// Trap the key up event
		$('#tracksSearch').keyup(function() {
			var _this = this;
			// Show only matching TR, hide rest of them
			$.each($('#tracksTable tbody').find('tr'), function() {
				if($(this).text().toLowerCase().indexOf($(_this).val().toLowerCase()) === -1) {
					$(this).hide();
				} else {
					$(this).show();                
				}
			});
		});	

		// Stupid table sort
		var $table = $('#tracksTable').stupidtable();
		// Default sort is by track name
		var thToSort = $table.find('thead th').eq(1);
		thToSort.stupidsort();

		// Handle row click
		$('#tracksTable tr').click(function() {
			var t = $(this).find('td').eq(4).html();
			if (t) { //Ignore header, which should be undefined
				window.location.href='?track=' + t;
			}
		});

		// Handle the tracks box
		$('#tracks-btn').click(function() {
		  $('#tracksModal').modal('show');
		  return false;
		});

	

	},
	setUpAllTracksView: function(tracks, region) {

		// map.setView([45.52, -122.6819], 3);
		$('#infoPanelContainer').hide();

		var trackMarkersLayerGroup = L.markerClusterGroup();

		for (var tId in tracks) {
			var m = L.marker(tracks[tId].trackLatLng, {icon: L.MakiMarkers.icon({icon: 'pitch', color: TRAIL_MARKER_COLOR, size: 'm'})});
			m.bindPopup('<a href="?track=' + tId + '">' + tracks[tId].trackName + '</a>');
			trackMarkersLayerGroup.addLayer(m);
		}
		if (region) {
			map.fitBounds([region.sw, region.ne], {maxZoom: 9});
		} else {
			// map.fitWorld();
			map.fitBounds(trackMarkersLayerGroup.getBounds());
		}

		trackMarkersLayerGroup.addTo(map);
	},
	setUpGotoMenu: function(tracks) {
		// Set up data structure to hold bounding boxes and number of tracks per region
		var regions = [];
		var nWorld = 0;
		for (var tId in tracks) {
			nWorld++;
			if (tracks[tId].trackRegionTags) {
				for (var j=0; j<tracks[tId].trackRegionTags.length; j++) {
					var r = tracks[tId].trackRegionTags[j];
					if (!(r in regions)) {
						// Need to slice the arrays cuz we need to change their values
						regions[r] = {n: 1, sw: tracks[tId].trackLatLng.slice(), ne: tracks[tId].trackLatLng.slice()};
					} else {
						regions[r].n++;
						// Extend SW and NE bounding box as needed
						for (var k=0; k<2; k++) {
							if (tracks[tId].trackLatLng[k] < regions[r].sw[k]) {
								regions[r].sw[k] = tracks[tId].trackLatLng[k];
							}
							if (tracks[tId].trackLatLng[k] > regions[r].ne[k]) {
								regions[r].ne[k] = tracks[tId].trackLatLng[k];
							}
						}
					}
				}
			}
		}

		// Now we need menu entries to be sorted
		var sortedRegions = [];
		for (var region in regions) {
			sortedRegions.push(region);
		}
		sortedRegions.sort();

		$('#goto-menu').append('<li><a href=".">World <span class="badge pull-right">' + nWorld + '</span></a></li>');
		$('#goto-menu').append('<li class="divider"></li>');
		for (var i=0; i< sortedRegions.length; i++) {
			$('#goto-menu').append('<li><a href="?region=' + encodeURIComponent(sortedRegions[i]) + '">' +
									 sortedRegions[i] + '<span class="badge pull-right">' + regions[sortedRegions[i]].n +'</span></a></li>');
		}
		return regions;
	},
	setUpSingleTrackView: function(track, layerControl) {
		var trackMetrics;
		// Create the elevation control first
		var el = L.control.elevation({
			position: 'bottomleft',
			theme: 'blackwhite-theme',
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
		var tl = omnivore.gpx('data/' + track.trackId + '/gpx/' + track.trackGPX, null, customLayer).on('ready', function() {
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
		    	if (layer.feature.geometry.type === 'Point'){
		    		layer.setIcon(wpIcon);
		    	}
			});
			// Fit th map to the trail boundaries
	    	map.fitBounds(tl.getBounds()); 
	    	// map.setZoom(map.getBoundsZoom(tl.getBounds())-1); // For some reason this has a glitch on iPad

	    	// Set up trailhead marker assuming the very first point is at the trailhead
	    	var tLatLngs = tl.getLayers()[0].getLatLngs();
	        var trailIcon = L.MakiMarkers.icon({icon: 'pitch', color: TRAIL_MARKER_COLOR, size: 'm'});
	        var marker = L.marker(tLatLngs[0], {icon: trailIcon}).addTo(map);
	        marker.bindPopup('<a href="https://www.google.com/maps/dir//' + tLatLngs[0].lat + ',' + tLatLngs[0].lng + '/" target="_blank">' + 'Trailhead' + '</a>');

			// Set up info panel control 
			var infoPanelContainer = L.DomUtil.create('div', 'info infoPanelContainer');
			var infoPanelTitle = L.DomUtil.create('div', 'infoPanelTitle', infoPanelContainer);
			var infoPanelBody = L.DomUtil.create('div', 'infoPanelBody', infoPanelContainer);
			var infoPanelDescription = L.DomUtil.create('div', 'infoPanelDescription', infoPanelBody);
			var slideShowContainer = L.DomUtil.create('div', 'slideShowContainer', infoPanelBody);

			var infoPanel = L.control({position: 'topright'});
			infoPanel.onAdd = function () {
				var fav = '';
				if (track.trackFav) {
					fav = FAVORITE;
				}
				infoPanelTitle.innerHTML = '<b>' + track.trackName + ' ' + fav + '</b>';
				infoPanelDescription.innerHTML = '<hr><b>' + track.trackLevel + '</b><br>' + 
									' <b>Length:</b> ' + trackMetrics[0] + 'km - <b>Elevation Gain:</b> ' + trackMetrics[1] + 'm' + 
									' <b>Max Elevation:</b> ' + trackMetrics[2] + 'm' + 
									' <b>Min Elevation:</b> ' + trackMetrics[3] + 'm' +
									'<br><b>Region:</b> ' + track.trackRegionTags + '<hr>' + track.trackDescription + '<hr>' +
									'<a href="data/' + track.trackId + '/gpx/' + track.trackGPX + '" download>Download GPS track</a>'; 
				
				// Populate photos
				if (track.hasPhotos) {
					$.lightbox.options.wrapAround = true; // Tell lightbox to do a wraparound album (this depends on a small modification I made to Lightbox)
					// Go get the geo tags and then put the pics on the map
					tmData.getGeoTags(track.trackId, function(data) {
						var haveGeoTags = false;	 
						var photoLayerGroup = L.layerGroup();
						slideShowContainer.innerHTML = '<hr>';

						for (var k=0; k<data.geoTags.trackPhotos.length; k++) {
							slideShowContainer.innerHTML += '<a href="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picName +
												  '" data-lightbox="slideshow" data-title="' + data.geoTags.trackPhotos[k].picCaption + '"' +
												  '><img class="infoThumbs" src="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picThumb + '" /></a>';

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
						}
						// If we have geotagged pictures, add a layer control to show/hide them
						if (haveGeoTags) {
							photoLayerGroup.addTo(map);
							layerControl.addOverlay(photoLayerGroup, 'Show track photos');
						}

					}, function(jqxhr, textStatus) {console.log(textStatus);}); // For now, ignore errors looking for the geotags files
				}
				return infoPanelContainer;
			};

			infoPanel.addTo(map);

			// Enable proper info panel scrolling by adjusting max-height dynamically
			// The 80 is to cover the bootstrap banner and the attribution at the bottom
			// TODO: fix hardcoded 80 by querying the actual sizes of elements
			$('.info').css('max-height', $(window).height()-80);
			$(window).bind('resize',function() {
    			$('.info').css('max-height', $(window).height()-80);
			});

			// Stop propagation of some event that the info box needs to handle
			$('.infoPanelContainer').bind('mousedown wheel scrollstart touchstart', function(e) {e.stopPropagation();}); 
    		L.DomEvent.disableClickPropagation(infoPanelContainer);

			var showToggle = false;
			// Toggle for expand/collapse is different on mouse versus touch
			if (!L.Browser.touch) {
				$('.infoPanelContainer').hover(
					function() {
						if (!showToggle) {
							$('.infoPanelBody').show();
							showToggle = true;
						}
					},
					function() {
						if (showToggle) {
							$('.infoPanelBody').hide();
							showToggle = false;
						}
					}
				);
			} else {
				$('.infoPanelContainer').on('click', function() {
					if (showToggle) {
						$('.infoPanelBody').hide();
						showToggle = false;
					} else {
						$('.infoPanelBody').show();
						showToggle = true;
					}
				});		
				$('#map').on('touchstart',
					function () {
						if (showToggle) {
							$('.infoPanelBody').hide();
							showToggle = false;
						}
					}
				); 						
			}
		}).addTo(map);


	}
};