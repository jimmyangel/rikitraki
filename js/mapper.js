'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmMap */
/* globals L, omnivore, tmConfig, tmData, tmUtils, map, FB, lightbox */

var TRAIL_MARKER_COLOR = '7A5C1E';
var WAYPOINT_COLOR = '#3887BE';
var TRACK_COLOR = '#8D6E27';
var INSIDE_TRACK_COLOR = '#EBEB00';
var SELECTED_THUMBNAIL_COLOR = '#00FF00';
var FAVORITE = '&#10029;';

var tmMap = {
	setUpCommon: function () {
		// Handle the about box
		$('#about-btn').click(function() {
		  $('#aboutModal').modal('show');
		  return false;
		});

		// Get and initialize the facebook sdk
		$.getScript('//connect.facebook.net/en_US/sdk.js', function() {
		    FB.init({
		      appId: '111118879223414',
		      version: 'v2.3' 
		    });     
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
		//$('#infoPanelContainer').hide();
		var trackMarkersLayerGroup = tmMap.setUpMarkersForAllTracks(tracks);

		if (region) {
			map.fitBounds([region.sw, region.ne], {maxZoom: 9});
		} else {
			// map.fitWorld();
			map.fitBounds(trackMarkersLayerGroup.getBounds());
		}

		// Set up twitter and facebook links
		tmMap.setUpSocialButtons('Check out hiking trails on RikiTraki');
	},
	setUpMarkersForAllTracks: function(tracks, trackId) {
		var trackMarkersLayerGroup = L.markerClusterGroup();
		for (var tId in tracks) {
			if (tId !== trackId) {
				var m = L.marker(tracks[tId].trackLatLng, {icon: L.MakiMarkers.icon({icon: 'marker-stroked', color: TRAIL_MARKER_COLOR, size: 'm'})});
				m.bindPopup('<a href="?track=' + tId + '">' + tracks[tId].trackName + '</a>');
				trackMarkersLayerGroup.addLayer(m);
			}
		}
		trackMarkersLayerGroup.addTo(map);
		return trackMarkersLayerGroup;
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
	setUpSingleTrackView: function(track, layerControl, tracks) {
		var trackMarkersLayerGroup = tmMap.setUpMarkersForAllTracks(tracks, track.trackId);
		layerControl.addOverlay(trackMarkersLayerGroup, 'Show markers for all tracks');

		var trackMetrics;

		// If region is US, we use imperial units
		var imperial = (track.trackRegionTags.indexOf('US') === -1) ? false : true;

		// Create the elevation control first	
		var el = L.control.elevation({
			position: 'bottomleft',
			theme: 'blackwhite-theme',
			width: 400,
			height: 125,
			collapsed: true,
			imperial: imperial
		});
		el.addTo(map);	

		var insideT; // Here we will put the inside line of the track in a different color

		// We use a custom layer to have more control over track display
		var customLayer = L.geoJson(null, {
			// Set the track color
		    style: function() {
		        return {color: TRACK_COLOR, opacity: 0.8, weight: 8};
		    },
		    // Bind elevation control via onEachFeature
		    onEachFeature: function (feature, layer) {
		    	// Elevation control only understands lines
	    		if (feature.geometry.type === 'LineString') {
	 				// Save this line to draw the inside of the track
	 				insideT = layer.toGeoJSON();
	 				el.addData.bind(el)(feature, layer);
	 			}
		    }
		});

		// Get gpx track data and put it on the map
		var tl = omnivore.gpx('data/' + track.trackId + '/gpx/' + track.trackGPX, null, customLayer).on('ready', function() {
			// Change the default icon for waypoints
	        var wpIcon = L.MakiMarkers.icon({icon: 'embassy', color: WAYPOINT_COLOR, size: 's'});
	        var trackDate = 'Not Available'; // By default
	        // var trackCoordinates;
	        // Now let's iterate over the features to customize the popups and get some data (e.g., track date)
			this.eachLayer(function (layer) {
				layer.bindPopup(layer.feature.properties.name, {maxWidth: 200});
				// Hey since we are iterating through features, we may as well get the track distance, elevation gain and other track useful info
				if (layer.feature.geometry.type === 'LineString') {
					trackMetrics = tmUtils.calculateTrackMetrics(layer.feature);
					// Grab the recorded date, if available
					if (layer.feature.properties.time) {
						trackDate = new Date(layer.feature.properties.time).toString();
					}
				}
				// Set the icon for Point markers
		    	if (layer.feature.geometry.type === 'Point'){
		    		layer.setIcon(wpIcon);
		    		// If date not available from the LineString, try from one of the waypoints
		    		if (trackDate === 'Not Available') {
		    			if (layer.feature.properties.time) {
		    				trackDate = new Date(layer.feature.properties.time).toString();
		    			}
		    		}
		    	}
			});
			// Fit th map to the trail boundaries leaving 50% room for the info panel
	    	// map.fitBounds(tl.getBounds(), {paddingBottomRight: [($('.infoPanelContainer').width()), 0]}); 
	    	// map.fitBounds(tl.getBounds(), {maxZoom: map.getBoundsZoom(tl.getBounds())-1, paddingBottomRight: [($('#map').width())*.5, 0]}); 
	    	// map.setZoom(map.getBoundsZoom(tl.getBounds())-1); // For some reason this has a glitch on iPad

	    	// Go ahead and draw the inside line (thinner and bright color like white)
			L.geoJson(insideT, {
				style: function () {
					return {color: INSIDE_TRACK_COLOR, weight: 2, opacity: 1};
				}
			}).addTo(map);

	    	// Set up trailhead marker assuming the very first point is at the trailhead
	    	var tLatLngs = tl.getLayers()[0].getLatLngs();
	        var thIconName = track.trackType ? track.trackType.toLowerCase() : 'hiking'; // Hiking is default icon
	        var marker = L.marker(tLatLngs[0], {zIndexOffset: 1000, icon: L.divIcon({html: '<img src="images/' + thIconName + '.png">'})}).addTo(map);
	        // Google directions hyperlink
	        marker.bindPopup('<a href="https://www.google.com/maps/dir//' + tLatLngs[0].lat + ',' + tLatLngs[0].lng + '/" target="_blank">' + 'Google Maps<br>Directions to Trailhead' + '</a>');

			// Set up info panel control 
			var infoPanelContainer = L.DomUtil.create('div', 'info infoPanelContainer');
			var infoPanelTitle = L.DomUtil.create('div', 'infoPanelTitle', infoPanelContainer);
			var infoPanelBody = L.DomUtil.create('div', 'infoPanelBody', infoPanelContainer);
			var infoPanelDescription = L.DomUtil.create('div', 'infoPanelDescription', infoPanelBody);
			var slideShowContainer = L.DomUtil.create('div', 'slideShowContainer', infoPanelBody);

			var infoPanel = L.control({position: 'topright'});
			infoPanel.onAdd = function () {
				infoPanelTitle.innerHTML = '<button class="close" aria-hidden="true">&times;</button>' + 
											'<b>' + track.trackName + ' ' + (track.trackFav ? FAVORITE : '' + '</b>');
				infoPanelDescription.innerHTML = '<hr><b>' + track.trackLevel + '</b><br>' + 
									' <b>Length:</b> ' + (imperial ? ((Math.round(trackMetrics[0] * 62.1371) / 100) + 'mi') : (trackMetrics[0] + 'km')) +
									' - <b>Elevation Gain:</b> ' + (imperial ? ((Math.round(trackMetrics[1] * 3.28084)) + 'ft') : (trackMetrics[1] + 'm')) + 
									' <b>Max Elevation:</b> ' + (imperial ? ((Math.round(trackMetrics[2] * 3.28084)) + 'ft') : (trackMetrics[2] + 'm')) + 
									' <b>Min Elevation:</b> ' + (imperial ? ((Math.round(trackMetrics[3] * 3.28084)) + 'ft') : (trackMetrics[3] + 'm')) +
									'<br><b>Region:</b> ' + track.trackRegionTags + '<br><b>Date Recorded:</b> ' + trackDate +  
									'<hr>' + track.trackDescription + '<hr>' +
									'<a href="data/' + track.trackId + '/gpx/' + track.trackGPX + '" download>Download GPS track</a>'; 
				
				// Populate photos
				if (track.hasPhotos) {
					// Tell lightbox to do a wraparound album and to show nav on touch devices
					lightbox.option({'wrapAround': true, 'alwaysShowNavOnTouchDevices': true});
					// Go get the geo tags and then put the pics on the map
					tmData.getGeoTags(track.trackId, function(data) {
						var haveGeoTags = false;	 
						var photoLayerGroup = L.layerGroup();
						slideShowContainer.innerHTML = '<hr>';

						for (var k=0; k<data.geoTags.trackPhotos.length; k++) {
							// Tell lightbox that this is a slideshow
							slideShowContainer.innerHTML += '<a href="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picName +
												  '" data-lightbox="slideshow" data-title="' + data.geoTags.trackPhotos[k].picCaption + '"' +
												  '><img  nopin="nopin" class="infoThumbs" geoTagXRef="' + k + 
												  '" src="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picThumb + '" /></a>';

							// If we have geotags, go ahead and place them on thumbnail photo markers and don't do a slideshow, just single image
							if (data.geoTags.trackPhotos[k].picLatLng) {
								haveGeoTags = true;
								var img ='<a href="data/' + track.trackId + '/photos/' + data.geoTags.trackPhotos[k].picName + 
										 '" data-lightbox="picture' + '" data-title="' + data.geoTags.trackPhotos[k].picCaption +
										 '" ><img geoTagRef="' + k + '"picLatLng="' + data.geoTags.trackPhotos[k].picLatLng.toString() + '" src="data/' + track.trackId + 
										 '/photos/' + data.geoTags.trackPhotos[k].picThumb + '" width="40" height="40"/></a>';
								var photoMarker = L.marker(data.geoTags.trackPhotos[k].picLatLng, {
									clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
									icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
								});
								photoLayerGroup.addLayer(photoMarker);
							}
						}
						// If we have geotagged pictures, add a layer control to show/hide them and handle hover over slide show
						if (haveGeoTags) {
							photoLayerGroup.addTo(map);
							layerControl.addOverlay(photoLayerGroup, 'Show track photos');

							// Highlight geolocated thumbnail associated with hovered picture in info panel
							$('.slideShowContainer img').hover(
								function() {
									$(this).css('border-color', SELECTED_THUMBNAIL_COLOR);
									$('[geoTagRef=' + $(this).attr('geoTagXRef') + ']').parent().parent().css('border-color', SELECTED_THUMBNAIL_COLOR);
								},
								function() {
									$(this).css('border-color', '#fff');
									$('[geoTagRef=' + $(this).attr('geoTagXRef') + ']').parent().parent().css('border-color', '#fff');
								}
							);				
						}


					}, function(jqxhr, textStatus) {console.log(textStatus);}); // TODO Handle this; for now, ignore errors looking for the geotags files
				}
				return infoPanelContainer;
			};

			infoPanel.addTo(map);

			// Fit th map to the trail boundaries leaving 50% room for the info panel
	    	map.fitBounds(tl.getBounds(), {paddingBottomRight: [($('.infoPanelContainer').width()), 0]}); 


			// Enable proper info panel scrolling by adjusting max-height dynamically
			// The 80 is to cover the bootstrap banner and the attribution at the bottom
			// TODO: fix hardcoded 80 by querying the actual sizes of elements
			$('.info').css('max-height', $(window).height()-80);
			$(window).bind('resize',function() {
    			$('.info').css('max-height', $(window).height()-80);
			});

			// Stop propagation of some events that the info box needs to handle
			$('.infoPanelContainer').bind('mousedown wheel scrollstart touchstart', function(e) {e.stopPropagation();}); 
    		// L.DomEvent.disableClickPropagation(infoPanelContainer);

    		// By default, info panel is collapsed so close button should be hidden
    		// $('.infoPanelTitle button').hide();

			// Event handling for expand/collapse on click
			var showToggle = true;
			$('.infoPanelTitle').on('click', function(e) {
				showToggle = tmMap.expandInfoPanel(showToggle, e);
			});
			$('.infoPanelTitle button').on('click', function(e) {
				showToggle = tmMap.collapseInfoPanel(showToggle, e);
			});
			$('.infoPanelDescription').on('click', function(e) {
				e.stopPropagation();
			});
			// Close the info panel if clicked (or key pressed) on the map (cannot stop propagation because it breaks lightbox)
			$('#map').on('click keyup', function(e) {
				showToggle = tmMap.collapseInfoPanel(showToggle, e, true);
			});		
	
		}).addTo(map);

		// Set up twitter and facebook links and such
		tmMap.setUpSocialButtons(track.trackName);
	},
	expandInfoPanel: function (toggle, e) {
		e.stopPropagation();
		if (!toggle) {
			$('.infoPanelBody').show();
			$('.infoPanelTitle button').show();
			$('.infoPanelTitle b').css('cursor', 'text');
			toggle = true;
		}
		return toggle;
	},
	collapseInfoPanel: function (toggle, e, propagate) {
		if (!propagate) {
			e.stopPropagation();
		}
		if (toggle) {
			$('.infoPanelTitle button').hide();				
			$('.infoPanelBody').hide();
			$('.infoPanelTitle b').css('cursor', 'pointer');
			toggle = false;
		}
		return toggle;
	},
	setUpSocialButtons: function (text) {
		// Twitter
		$('.btn-twitter').attr('href', 'https://twitter.com/intent/tweet?text=' + text + '&url=' + window.location.href + '&via=jimmieangel' + '&hashtags=rikitraki');
		// Facebook
		$('#fb-btn').click(function() {
			FB.ui({
				method: 'feed',
				link: window.location.href,
				caption: text,
			}, function(){});
		  return false;
		});
	}
};