'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmMap */
/* globals L, omnivore, tmForms, tmData, tmUtils, map:true, FB, lightbox, Cesium, isMobile, isWebGlSupported, API_BASE_URL */

var TRAIL_MARKER_COLOR = '7A5C1E';
var WAYPOINT_COLOR = '#3887BE';
var TRACK_COLOR = '#8D6E27';
var INSIDE_TRACK_COLOR = '#EBEB00';
var SELECTED_THUMBNAIL_COLOR = '#00FF00';
var FAVORITE = '&#10029;';
var KEYCODE_ESC = 27;
var KEYCODE_SPACE = 32;
var CAMERA_OFFSET = 6000;

var tmMap = {
	setUpCommon: function (tracks) {

		tmForms.setUpUserForms();

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

		// Set up bootstrap menus (Go to and Tracks)
		this.setUpTracksMenu(tracks);
		return this.setUpGotoMenu(tracks);
	},
	setUpGlobe: function (tracks, regions) {
		$('#mapGlobeButton').append('<li><a role="button" title="Map" href="."><span class="glyphicon icon-map2" aria-hidden="true"></span></a></li>');

		var self = this;
		$('#map').hide();
		var drillPickLimit = isMobile ? 1 : undefined;
		var viewer = new Cesium.Viewer('globe', {
							// scene3DOnly: true, 
							baseLayerPicker: false,
							imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
								url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
								enablePickFeatures: false
							}),
							animation: false,
							fullscreenButton: false,
							geocoder: false,
							homeButton: false,
							infoBox: false,
							sceneModePicker: false,
							selectionIndicator: false,
							timeline: false,
							navigationHelpButton: false,
							navigationInstructionsInitiallyVisible: false,
							skyAtmosphere: false,
							creditContainer: 'creditContainer'});

		viewer.scene.screenSpaceCameraController.enableTilt = false;
		viewer.scene.screenSpaceCameraController.enableLook = false;
		viewer.scene.screenSpaceCameraController.enableTranslate = false;

		// Populate track markers
		for (var tId in tracks) {
			viewer.entities.add({
				name: tId,
				position : Cesium.Cartesian3.fromDegrees(tracks[tId].trackLatLng[1], tracks[tId].trackLatLng[0]),
				point : {
					pixelSize : 10,
					color : Cesium.Color.YELLOW
				}
			});
		}

		// On hover, change cursor style
		var savedCursor = $('#globe').css('cursor');
		var pointerCursorToggle = false;
		$('#globe').on('mousemove', function (e) {
			var p = viewer.scene.pick(new Cesium.Cartesian2(e.offsetX, e.offsetY));
			if (Cesium.defined(p)) {
				var entity = p.id;
				if (entity instanceof Cesium.Entity) {
					if (!pointerCursorToggle) {
						pointerCursorToggle = true;
						$('#globe').css('cursor', 'pointer');
					}
				} else {
					if (pointerCursorToggle) {
						pointerCursorToggle = false;
						$('#globe').css('cursor', savedCursor);
					}
				}
			} else {
				if (pointerCursorToggle) {
					pointerCursorToggle = false;
					$('#globe').css('cursor', savedCursor);
				}
			}
		});

		// On click open pop up
		$('#globe').on('click touchstart', function (e) {
			var c;
			if (e.type === 'touchstart'){ 
				c = new Cesium.Cartesian2(e.originalEvent.touches[0].clientX, e.originalEvent.touches[0].clientY - 50);
			} else {
				c = new Cesium.Cartesian2(e.offsetX, e.offsetY);
			}
			var popUpCreated = false;
			var pArray = viewer.scene.drillPick(c, drillPickLimit);
			var pArrayLength = pArray.length;
			for (var i=0; i<pArrayLength; i++) { 
				if (Cesium.defined(pArray[i])) {
					var entity = pArray[i].id;
					if (entity instanceof Cesium.Entity) {
						var br = '';
						if (Cesium.defined(entity.point)) {
							if (!popUpCreated) {
								$('#trackPopUpLink').empty();
								popUpCreated = true;	
							} else {
								br = '<br>';
							}
							$('#trackPopUpLink').append('<a href="?track=' + entity.name + '">' + br + tracks[entity.name].trackName + '</a>');
						}
					}
				} 
			}
			if (popUpCreated) {
				$('#trackPopUp').show();
				self.positionPopUp(c); // Initial position at the place item picked
				var removeHandler = viewer.scene.postRender.addEventListener(function () {
					var changedC = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, entity.position.getValue(Cesium.JulianDate.now()));
					// If things moved, move the popUp too
					if ((c.x !== changedC.x) || (c.y !== changedC.y)) {
						self.positionPopUp(changedC);
						c = changedC;
					}
				}); 
				// PopUp close button event handler
				$('.leaflet-popup-close-button').on('click', function () {
					$('#trackPopUp').hide();
					$('#trackPopUpLink').empty();
					removeHandler.call();
					return false;
				});	
			}		
		});

		this.setUpMotdInfoBox(tracks, false);

		// Set up zoom control click events
		var dest = new Cesium.Cartesian3();
		// flyTo has a nice animation, that's why I am using it instead of zoomIn/zoomOut
		// TO DO: adjust multiplier dapending on camera height
		$('.leaflet-control-zoom-in').click(function() {
		 	viewer.camera.flyTo({destination: Cesium.Cartesian3.divideByScalar(viewer.camera.position, 1.2, dest), duration: 0.5});
		 	return false;
		});
		$('.leaflet-control-zoom-out').click(function() {
		 	viewer.camera.flyTo({destination: Cesium.Cartesian3.multiplyByScalar(viewer.camera.position, 1.2, dest), duration: 0.5});
			return false;
		});
		$('#globe-control-north').click(function() {
		 	viewer.camera.setView({heading: 0.0});
			return false;
		});
		// Refresh destroys everyting and starts over 
		$('#globe-control-refresh').click(function() {
			$('.leaflet-control-zoom-in').off();
			$('.leaflet-control-zoom-out').off();
			$('#globe-control-refresh').off();
			$('#globe-control-north').off();
			$('#globe').off();
			$('#trackPopUp').hide();
			$('#infoPanel').empty();
			$('#mapGlobeButton').empty();
			$('#fb-btn').off();
		 	viewer.destroy();
		 	self.setUpGlobe(tracks, regions);
			return false;
		});

		// Set up twitter and facebook links
		this.setUpSocialButtons('Check out hiking trails on the RikiTraki globe');
	},
	positionPopUp: function (c) {
		var x = c.x - ($('#trackPopUpContent').width()) / 2;
		var y = c.y - ($('#trackPopUpContent').height());
		/* $('#trackPopUpContent').css('left', x + 'px');
		$('#trackPopUpContent').css('top', y + 'px'); */
		$('#trackPopUpContent').css('transform', 'translate3d(' + x + 'px, ' + y + 'px, 0)');

	},
	setUpMap: function (l) {
		$('#globe').hide();

		if (isWebGlSupported) {
			$('#mapGlobeButton').append('<li><a role="button" title="Globe" href="./?globe=yes"><span class="glyphicon icon-sphere" aria-hidden="true"></span></a></li>');
		}

		map = new L.map('map');

		// Populate basemap layers from JSON config file
		// Add layer control
		// var layerControl = L.control.layers(null, null, {position: 'topleft', collapsed: true}).addTo(map);
		var layerControl = L.control.layers(null, null, {position: 'topleft', collapsed: true});

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

		var layerArray = l.layers;

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
	setUpAllTracksView: function(tracks, region, layerControl) {

		layerControl.addTo(map);
		var trackMarkersLayerGroup = this.setUpMarkersForAllTracks(tracks);

		if (region) {
			map.fitBounds([region.sw, region.ne], {maxZoom: 9});
		} else {
			// map.fitBounds(trackMarkersLayerGroup.getBounds());
			// Set up motd box (What's new)
			this.setUpMotdInfoBox(tracks, true);
			map.fitBounds(trackMarkersLayerGroup.getBounds(), {paddingBottomRight: [$(window).width() < 1000 ? 0 : 240, 0]}); 
		}
		// Set up twitter and facebook links
		this.setUpSocialButtons('Check out hiking trails on RikiTraki');
	},
	setUpMotdInfoBox: function (tracks, isLeaflet) {
		var self = this;
		tmData.getMotd(function(data) {
			var infoPanelContainer = self.buildMotdInfoBoxDOMElement(tracks, data);
			if (isLeaflet) {
				var infoPanel = L.control({position: 'topright'});
				infoPanel.onAdd = function () {
					return infoPanelContainer;
				};
				infoPanel.addTo(map);
			} else {
				// Not leaflet, but we still use leaflet's styles
				infoPanelContainer.className += ' leaflet-control'; 
				$('#infoPanel').append(infoPanelContainer);
				self.setUpInfoPanelEventHandling();
			}
			self.setUpInfoPanelEventHandling();
			// Handle row click
			$('#motdTable tr').click(function() {
				var t = $(this).find('td').eq(2).html();
				if (t) { 
					window.location.href='?track=' + t;
				}
			});
		});
	},
	buildMotdInfoBoxDOMElement: function (tracks, data) {
		var infoPanelContainer = L.DomUtil.create('div', 'info motd infoPanelContainer');
		var infoPanelTitle = L.DomUtil.create('div', 'infoPanelTitle', infoPanelContainer);
		var infoPanelBody = L.DomUtil.create('div', 'infoPanelBody', infoPanelContainer);
		var infoPanelDescription = L.DomUtil.create('div', 'motdDescription infoPanelDescription', infoPanelBody);
		infoPanelTitle.innerHTML = '<button class="close" aria-hidden="true">&times;</button><b>What\'s New...</b>';
		var motdHTML = '<table id="motdTable" class="table table-condensed table-hover"><tbody>';
		for (var i=0; i<data.motd.motdTracks.length; i++) {			
			motdHTML += '<tr><td><img class="motdThumbs" src=' + API_BASE_URL + '/v1/tracks/' + data.motd.motdTracks[i][0] + '/thumbnail/' + data.motd.motdTracks[i][1] + 
						// '></td><td>' +
						'></td><td>' +
						tracks[data.motd.motdTracks[i][0]].trackName +
						'</td><td style="display:none">' + 
						data.motd.motdTracks[i][0] + '</td></tr>';
		}
		motdHTML += '</tbody></table>';
		infoPanelDescription.innerHTML = motdHTML;
		return infoPanelContainer;
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
									 sortedRegions[i].substr(0, 30) + '<span class="badge pull-right">' + regions[sortedRegions[i]].n +'</span></a></li>');
		}
		return regions;
	},
	setUpSingleTrackView: function(track, tracks, layerControl) {
		var self = this;

		tmForms.enableEditButton(track); // If the user is logged in and owns the track then allow editing

		var trackMarkersLayerGroup = this.setUpMarkersForAllTracks(tracks, track.trackId);
		layerControl.addOverlay(trackMarkersLayerGroup, 'Show markers for all tracks');

		var trackMetrics;

		// If region is US, we use imperial units
		var imperial = (track.trackRegionTags.indexOf('US') === -1) ? false : true;

		// Create the elevation control first	
		var el = L.control.elevation({
			position: 'bottomleft',
			theme: 'blackwhite-theme',
			width: $(window).width() < 400 ? 300: 400,
			height: 125,
			collapsed: true,
			imperial: imperial
		});
		el.addTo(map);	

		// Set up terrain button (but only if WebGL is supported)
		if (isWebGlSupported) {
			var terrainControl = L.control({position: 'topleft'});
			terrainControl.onAdd = function () {
				var terrainControlContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar terrain-control');
				terrainControlContainer.innerHTML = '<a id="terrainControl" style="text-shadow: 2px 2px 2px #666666;" href="#" title="3D Terrain">3D</a>';
				return terrainControlContainer;
			};
			terrainControl.addTo(map);
			$('.terrain-control').on('click', function () {
				window.location.href='?track=' + track.trackId + '&terrain=yes';
				return false;
			});
		}
		// Later control should always be the last one
		layerControl.addTo(map);


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
		var tl = omnivore.gpx(API_BASE_URL + '/v1/tracks/' + track.trackId + '/GPX', null, customLayer).on('ready', function() {
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
									'<a href="' + API_BASE_URL + '/v1/tracks/' + track.trackId + '/GPX' + '" download>Download GPS track</a>'; 
				
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
							slideShowContainer.innerHTML += '<a href="'+ API_BASE_URL + '/v1/tracks/' + track.trackId + '/picture/' + k +
												  '" data-lightbox="slideshow" data-title="' + data.geoTags.trackPhotos[k].picCaption + '"' +
												  '><img  nopin="nopin" class="infoThumbs" geoTagXRef="' + k + 
												  '" src="' + API_BASE_URL + '/v1/tracks/' + track.trackId + '/thumbnail/' + k + '" /></a>';

							// If we have geotags, go ahead and place them on thumbnail photo markers and don't do a slideshow, just single image
							if (data.geoTags.trackPhotos[k].picLatLng) {
								haveGeoTags = true;
								var img ='<a href="' + API_BASE_URL + '/v1/tracks/' + track.trackId + '/picture/' + k + 
										 '" data-lightbox="picture' + '" data-title="' + data.geoTags.trackPhotos[k].picCaption +
										 '" ><img geoTagRef="' + k + '"picLatLng="' + data.geoTags.trackPhotos[k].picLatLng.toString() + 
										 '" src="'+ API_BASE_URL + '/v1/tracks/' + track.trackId + 
										 '/thumbnail/' + k + '" width="40" height="40"/></a>';
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
	    	self.setUpInfoPanelEventHandling();

	
		}).addTo(map);

		// Set up twitter and facebook links and such
		this.setUpSocialButtons(track.trackName);
	},
	setUpSingleTrackTerrainView: function(track) {
		$('#map').hide();
		$('.help3d').show();
		$('#mapGlobeButton').append('<li><a role="button" title="Map" href="."><span class="glyphicon icon-map2" aria-hidden="true"></span></a></li>');

		var viewer = new Cesium.Viewer('globe', {
							// scene3DOnly: true, 
							baseLayerPicker: false,
							imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
								url: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
								enablePickFeatures: false
							}),
							animation: false,
							fullscreenButton: false,
							geocoder: false,
							homeButton: false,
							infoBox: false,
							sceneModePicker: false,
							selectionIndicator: false,
							timeline: false,
							navigationHelpButton: false,
							navigationInstructionsInitiallyVisible: false,
							skyAtmosphere: false,
							scene3DOnly: true,
							creditContainer: 'creditContainer'});


		var terrainProvider = new Cesium.CesiumTerrainProvider({
			url : 'http://assets.agi.com/stk-terrain/world',
			requestWaterMask : false,
			requestVertexNormals : true
		}); 
		viewer.terrainProvider = terrainProvider;

		// Should use fly to bounding sphere instead
		omnivore.gpx(API_BASE_URL + '/v1/tracks/' + track.trackId + '/GPX', null).on('ready', function() {
			// First grab the GeoJSON data from omnivore
			var trackGeoJSON = this.toGeoJSON();

			viewer.camera.flyTo({
				destination : Cesium.Cartesian3.fromDegrees(
								this.getBounds().getCenter().lng, 
								this.getBounds().getCenter().lat - 0.09, 
								trackGeoJSON.features[0].geometry.coordinates[0][2] + CAMERA_OFFSET),
				duration: 0,
				orientation : {
					heading : Cesium.Math.toRadians(0.0),
					pitch : Cesium.Math.toRadians(-35.0),
					roll : 0.0
				}
			}); 

			// Remove all features except LineString (for now)
			var i = trackGeoJSON.features.length;
			while (i--) {
				if (trackGeoJSON.features[i].geometry.type !== 'LineString') {
					trackGeoJSON.features.splice(i, 1);
				}
			}

			// Go ahead and draw the track
			viewer.dataSources.add(Cesium.GeoJsonDataSource.load(trackGeoJSON, {stroke: Cesium.Color.fromCssColorString(INSIDE_TRACK_COLOR), strokeWidth: 3}));
			// And draw the trailhead too
			var thIconName = track.trackType ? track.trackType.toLowerCase() : 'hiking'; // Hiking is default icon
			viewer.entities.add({
				name: track.trackId,
				position : Cesium.Cartesian3.fromDegrees(
								trackGeoJSON.features[0].geometry.coordinates[0][0], 
								trackGeoJSON.features[0].geometry.coordinates[0][1], 
								trackGeoJSON.features[0].geometry.coordinates[0][2]),
				billboard : {
					image : 'images/' + thIconName + '.png',
					verticalOrigin : Cesium.VerticalOrigin.BOTTOM
				}
			}); 

		});

		// Set up track name in info box
		$('#infoPanel').append('<div style="min-width: 200px;" class="info leaflet-control"><b>' + track.trackName + ' ' + (track.trackFav ? FAVORITE : '') + '</b></div>');
		$('#infoPanel div').css('cursor', 'pointer');
		$('#infoPanel').on('click', function () {
			window.location.href='?track=' + track.trackId;
			return false;
		});		

		// Set up zoom control click events
		$('.leaflet-control-zoom-in').click(function() {
		 	viewer.camera.zoomIn(2000);
		 	return false;
		});
		$('.leaflet-control-zoom-out').click(function() {
		 	viewer.camera.zoomOut(2000);
			return false;
		});
		$('#globe-control-north').hide();

		// Refresh destroys everyting and starts over 
		$('#globe-control-refresh').click(function() {
			location.reload();
			return false;
		});

		// Set up twitter and facebook links and such
		this.setUpSocialButtons(track.trackName);

	},
	setUpInfoPanelEventHandling: function () {
		var self = this;
		// Enable proper info panel scrolling by adjusting max-height dynamically intially and on window resize
		var windowSlack = $('#navigationBar').outerHeight(true) + $('.leaflet-control-attribution').outerHeight(true);
		$('.info').css('max-height', $(window).height() - windowSlack);
		$(window).on('resize', function() {
			windowSlack = $('#navigationBar').outerHeight(true) + $('.leaflet-control-attribution').outerHeight(true);
			$('.info').css('max-height', $(window).height() - windowSlack);
		});

		// Make sure keyboard events can be handled
		$('.infoPanelContainer').attr('tabindex', '0');

		// Stop propagation of some events that the info box needs to handle
		$('.infoPanelContainer').on('mousedown wheel scrollstart touchstart mousewheel DOMMouseScroll MozMousePixelScroll', function(e) {
			e.stopPropagation();
		}); 
		// L.DomEvent.disableClickPropagation(infoPanelContainer);

		// By default, info panel is collapsed so close button should be hidden
		// $('.infoPanelTitle button').hide();

		// Event handling for expand/collapse on click
		var showToggle = true;
		// Give focus to the info panel to make it easy to use keyboard to scroll, if necessary
		$('.infoPanelContainer').focus();
		// Handle keyboard events
		$('.infoPanelContainer').on('keyup', function(e) {
			// Collapse info box on ESC or SPACE
			if ((e.keyCode === KEYCODE_ESC) || (e.keyCode === KEYCODE_SPACE)) {
				showToggle = self.collapseInfoPanel(showToggle, e);
			} else {
				// Let the info panel handle the other keys (like arrows and page-up/page-down), so stop propagation to the map
				e.stopPropagation();
			}
		});
		// Expand on title click
		$('.infoPanelTitle').on('click', function(e) {
			showToggle = self.expandInfoPanel(showToggle, e);
		});
		// Collapse on close button
		$('.infoPanelTitle button').on('click', function(e) {
			showToggle = self.collapseInfoPanel(showToggle, e);
		});
		// Ignore clicks on description to allow for copy and paste
		$('.infoPanelDescription').on('click', function(e) {
			e.stopPropagation();
		});
		// Close the info panel if clicked (or key pressed) on the map (cannot stop propagation because it breaks lightbox)
		$('#map').on('click keyup', function(e) {
			showToggle = self.collapseInfoPanel(showToggle, e, true);
		});
		$('#globe').on('click keyup touchstart', function(e) {
			showToggle = self.collapseInfoPanel(showToggle, e, true);
		});		
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
		$('.btn-twitter').attr('href', 'https://twitter.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(window.location.href) + '&via=jimmieangel' + '&hashtags=rikitraki');
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