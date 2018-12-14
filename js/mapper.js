'use strict';

import L from 'leaflet';
require ('leaflet.elevation/dist/leaflet.elevation-0.0.4.min.js');
require ('../bower_components/Leaflet.MakiMarkers/Leaflet.MakiMarkers.js');
require ('../bower_components/leaflet.markercluster/dist/leaflet.markercluster.js');
var omnivore = require ('../bower_components/leaflet-omnivore/leaflet-omnivore.js');
var StateMachine = require ('javascript-state-machine');
var lightbox = require ('lightbox2');
import {tmForms} from './forms.js';
import {tmData} from './data.js';
import {tmUtils} from './utils.js';
import {tmConfig, tmConstants, tmBaseMapLayers, tmMessages} from './config.js';

export var tmMap = (function () {
	var map; // For leaflet
	var viewer; //For Cesium
	var fsm3D; // Finite state machine for 3D functionality
	var trackDataSource;
	var geoTagsDataSource;
	var savedTrackMarkerEntity;

	var setUpCommon = function (tracks) {

		tmForms.setUpUserForms();
		$('#filter-btn').append('</span><span class="badge">' + Object.keys(tracks).length + '</span>');
		if(localStorage.getItem('rikitraki-filter')) {
			$('#filter-icon').addClass('filter-active');
		}

		// Handle the about box
		$('#about-btn').click(function() {
			$('#aboutModal').modal('show');
			return false;
		});

		// Get and initialize the facebook sdk
		/* $.getScript('//connect.facebook.net/en_US/sdk.js', function() {
		    FB.init({
		      appId: '111118879223414',
		      version: 'v2.3'
		    });
		}); */

		// Set up bootstrap menus (Go to and Tracks)
		setUpTracksMenu(tracks);
		return setUpGotoMenu(tracks);
	};

	var setUpMap = function () {
		$('#globe').hide();

		if (!isWebGlSupported) {
			$('#mapGlobeButton').hide();
		}

		map = new L.map('map');

		map.whenReady(function() {
			$('#loadingOverlay').hide();
			$('#loadingSpinner').spin(false);
		});

		// Populate basemap layers from JSON config file
		// Add layer control
		// var layerControl = L.control.layers(null, null, {position: 'topleft', collapsed: true}).addTo(map);
		var layerControl = L.control.layers(null, null, {position: 'topleft', collapsed: true});

		// Set up Spinnerner control
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

		var layerArray = tmBaseMapLayers;

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
	};

	var setUpTracksMenu = function (tracks) {
		// Populate tracks dialog box
		for (var tId in tracks) {
			$('#tracksTable').append('<tr><td>' + (tracks[tId].trackFav ? tmConstants.FAVORITE : '') +
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
				if (fsm3D) {
					$('#tracksModal').modal('hide');
					fsm3D.show3DTrack(tracks[t], tracks);
					return false;
				} else {
					window.location.href='?track=' + t;
				}
			}
		});

		// Handle the tracks box
		$('#tracks-btn').click(function() {
		  $('#tracksModal').modal('show');
		  return false;
		});
	};

	var setUpAllTracksView = function(tracks, region, layerControl) {

		layerControl.addTo(map);
		var trackMarkersLayerGroup = setUpMarkersForAllTracks(tracks);

		if (region) {
			map.fitBounds([region.sw, region.ne], {maxZoom: 9});
		} else {
			// map.fitBounds(trackMarkersLayerGroup.getBounds());
			// Set up motd box (What's new)
			setUpMotdInfoBox(tracks, true);
			map.fitBounds(trackMarkersLayerGroup.getBounds(), {paddingBottomRight: [$(window).width() < 1000 ? 0 : 240, 0]});
		}
		// Set up twitter and facebook links
		setUpSocialButtons(tmMessages.SOCIAL_DEFAULT_MSG);

		// Welcome message
		if (!localStorage.getItem('rikitraki-noWelcome') && !(sessionStorage.getItem('rikitraki-hasSeenWelcome'))) {
			setTimeout(function() {
				$('#welcomeMessage').modal('show');
				sessionStorage.setItem('rikitraki-hasSeenWelcome', true);
			}, 1000);

			setTimeout(function() {
				$('#welcomeMessage').modal('hide');
			}, 20000);

			$('#welcomeMessage').click(function () {
				$('#welcomeMessage').modal('hide');
			});

			$('#welcomeMessage').on('hide.bs.modal', function () {
				if ($('#welcome-optout').is(':checked')) {
					localStorage.setItem('rikitraki-noWelcome', true);
				}
			});
		}

	};

	var setUpMotdInfoBox = function (tracks, isLeaflet) {
		tmData.getMotd(function(data) {
			var infoPanelContainer = buildMotdInfoBoxDOMElement(tracks, data);
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
				setUpInfoPanelEventHandling();
			}
			setUpInfoPanelEventHandling();
			// Handle row click
			$('#motdTable tr').click(function() {
				var t = $(this).find('td').eq(2).html();
				if (t) {
					if (!tracks[t]) {
						$('#trackNotAvailable').modal('show');
					} else {
						if (isLeaflet) {
							window.location.href='?track=' + t;
						} else {
							fsm3D.show3DTrack(tracks[t], tracks);
						}
					}
				}
			});
		});
	};

	var buildMotdInfoBoxDOMElement = function (tracks, data) {
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
						data.motd.motdTracks[i][2] +
						'</td><td style="display:none">' +
						data.motd.motdTracks[i][0] + '</td></tr>';
		}
		motdHTML += '</tbody></table>';
		infoPanelDescription.innerHTML = motdHTML;
		return infoPanelContainer;
	};

	var setUpMarkersForAllTracks = function(tracks, trackId) {
		var trackMarkersLayerGroup = L.markerClusterGroup();
		for (var tId in tracks) {
			if (tId !== trackId) {
				var m = L.marker(tracks[tId].trackLatLng, {icon: L.MakiMarkers.icon({icon: 'marker-stroked', color: tmConstants.TRAIL_MARKER_COLOR, size: 'm'})});
				m.bindPopup('<a href="?track=' + tId + '">' + tracks[tId].trackName + '</a>');
				trackMarkersLayerGroup.addLayer(m);
			}
		}
		trackMarkersLayerGroup.addTo(map);
		return trackMarkersLayerGroup;
	};

	var setUpGotoMenu = function(tracks) {
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

		$('#goto-menu').append('<li><a href=".">All <span class="badge pull-right">' + nWorld + '</span></a></li>');
		$('#goto-menu').append('<li class="divider"></li>');
		for (var i=0; i< sortedRegions.length; i++) {
			$('#goto-menu').append('<li><a href="?region=' + encodeURIComponent(sortedRegions[i]) + '">' +
									 sortedRegions[i].substr(0, 30) + '<span class="badge pull-right">' + regions[sortedRegions[i]].n +'</span></a></li>');
		}
		return regions;
	};

	var setUpSingleTrackView = function(track, tracks, layerControl) {

		var trackMarkersLayerGroup = setUpMarkersForAllTracks(tracks, track.trackId);
		layerControl.addOverlay(trackMarkersLayerGroup, 'Show markers for all tracks');

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

		// We use a custom layer to have more control over track display
		var customLayer = L.geoJson(null, {
			// Set the track color
		    style: function() {
		        return {color: tmConstants.TRACK_COLOR, opacity: 0.8, weight: 8};
		    }
		});

		// Get gpx track data and put it on the map
		var tl = omnivore.gpx(API_BASE_URL + '/v1/tracks/' + track.trackId + '/GPX', null, customLayer).on('ready', function() {
			// If the user is logged in and owns the track then allow editing, passing track layer, in case we need to geotag pics
			tmForms.enableEditButton(track, tl);
			// Change the default icon for waypoints
	    var wpIcon = L.MakiMarkers.icon({icon: 'embassy', color: tmConstants.WAYPOINT_COLOR, size: 's'});
	    // Now let's iterate over the features to customize the popups and markers
			this.eachLayer(function (layer) {
				layer.bindPopup(layer.feature.properties.name, {maxWidth: 200});
				// Set the icon for Point markers
	    	if (layer.feature.geometry.type === 'Point'){
	    		layer.setIcon(wpIcon);
	    	}
			});
			// Fit th map to the trail boundaries leaving 50% room for the info panel
	    	// map.fitBounds(tl.getBounds(), {paddingBottomRight: [($('.infoPanelContainer').width()), 0]});
	    	// map.fitBounds(tl.getBounds(), {maxZoom: map.getBoundsZoom(tl.getBounds())-1, paddingBottomRight: [($('#map').width())*.5, 0]});
	    	// map.setZoom(map.getBoundsZoom(tl.getBounds())-1); // For some reason this has a glitch on iPad

	    // Go ahead and draw the inside line (thinner and bright color like yellow)
			var insideT = {type: 'FeatureCollection', features: []}; // Here we will put the inside line of the track in a different color
			insideT.features.push(tmUtils.extractSingleLineString(tl.toGeoJSON()));
			L.geoJson(insideT, {
				style: function () {
					return {color: tmConstants.INSIDE_TRACK_COLOR, weight: 2, opacity: 1};
				},
				onEachFeature: el.addData.bind(el)
			}).addTo(map);

			// Set up trailhead marker assuming the very first point is at the trailhead
			var tLatLngs = tl.getLayers()[0].getLatLngs();
			if (Array.isArray(tLatLngs[0])) { // If this is true, we have a MultiLineString
				tLatLngs = tLatLngs[0];
			}

			var thIconName = track.trackType ? track.trackType.toLowerCase() : 'hiking'; // Hiking is default icon
			var marker = L.marker(tLatLngs[0], {zIndexOffset: 1000, icon: L.divIcon({html: '<img src="images/' + thIconName + '.png">'})}).addTo(map);
			// Google directions hyperlink
			marker.bindPopup('<a href="https://www.google.com/maps/dir//' + tLatLngs[0].lat + ',' + tLatLngs[0].lng + '/" target="_blank">' + 'Google Maps<br>Directions to Trailhead' + '</a>');

			// Set up info panel control
			var infoPanelContainer = L.DomUtil.create('div', 'info infoPanelContainer');

			var infoPanel = L.control({position: 'topright'});

			var photoLayerGroup = L.layerGroup();
			infoPanel.onAdd = function () {
				$(infoPanelContainer).append(buildTrackInfoPanel(track, insideT, infoPanelContainer, function(geoTagPhotos) {
					var img ='<a href="' + API_BASE_URL + '/v1/tracks/' + track.trackId + '/picture/' +
							 geoTagPhotos.picIndex +
							 '" data-lightbox="picture' + '" data-title="' + geoTagPhotos.picCaption +
							 '" ><img geoTagRef="' + geoTagPhotos.picIndex + '"picLatLng="' + geoTagPhotos.picLatLng.toString() +
							 '" src="data:image/jpeg;base64,' + geoTagPhotos.picThumbBlob + '" width="40" height="40"/></a>';
					var photoMarker = L.marker(geoTagPhotos.picLatLng, {
						clickable: false, // This is necessary to prevent leaflet from hijacking the click from lightbox
						icon: L.divIcon({html: img, className: 'leaflet-marker-photo', iconSize: [44, 44]})
					});
					photoLayerGroup.addLayer(photoMarker);
				}, function() {
					if (photoLayerGroup.getLayers().length) {
						photoLayerGroup.addTo(map);
						layerControl.addOverlay(photoLayerGroup, 'Show track photos');
						// If the track title is small we need to update map bounds to account for added pictures
						map.fitBounds(tl.getBounds(), {paddingBottomRight: [($('.infoPanelContainer').width()), 0]});
						// Highlight geolocated thumbnail associated with hovered picture in info panel
						$('.slideShowContainer img').hover(
							function() {
								var el = $('[geoTagRef=' + $(this).attr('geoTagXRef') + ']');
								if (el.length) {
									$(this).css('border-color', tmConstants.SELECTED_THUMBNAIL_COLOR);
									el.parent().parent().css('border-color', tmConstants.SELECTED_THUMBNAIL_COLOR);
								}
							},
							function() {
								var el = $('[geoTagRef=' + $(this).attr('geoTagXRef') + ']');
								if (el.length) {
									$(this).css('border-color', '#fff');
									el.parent().parent().css('border-color', '#fff');
								}
							}
						);
					}
				}));
				return infoPanelContainer;
			};

			infoPanel.addTo(map);
			setUpInfoPanelEventHandling();

			// Fit th map to the trail boundaries leaving 50% room for the info panel
	    map.fitBounds(tl.getBounds(), {paddingBottomRight: [($('.infoPanelContainer').width()), 0]});

		}).addTo(map);

		// Set up twitter and facebook links and such
		setUpSocialButtons(track.trackName);
	};

	function populateBaseMapLayerControl() {
		var dflt = 0;
		for (var k=0; k<tmBaseMapLayers.length; k++) {
			if (tmBaseMapLayers[k].default3D) {dflt = k;}
			$('#basemap-layer-control').append(
				'<label><input value="' + k + '" type="radio" class="basemap-layer leaflet-control-layers-selector" name="leaflet-base-layers"' +
			 	((tmBaseMapLayers[k].default3D) ? 'checked="checked"' : '' ) +  '><span> ' + tmBaseMapLayers[k].layerName + '</span></label>');
		}

		$('#basemap-layer-control').change(function() {
			var selectedLayer = $('.basemap-layer:checked').val();
			viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
			viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
				url: tmBaseMapLayers[selectedLayer].layerUrl,
				maximumLevel: tmBaseMapLayers[selectedLayer].maxZoom,
				credit: tmBaseMapLayers[selectedLayer].attribution.replace(/<(.|\n)*?>/g, '')
			}));
		});

		$('#layer-control').on('mouseenter touchstart', function() {
			if (!$('#layer-control').hasClass('leaflet-control-layers-expanded')) {
				$('#layer-control').addClass('leaflet-control-layers-expanded');
				return false;
			}
		});

		$('#layer-control').on('mouseleave', function() {
			$('#layer-control').removeClass('leaflet-control-layers-expanded');
		});

		$('#globe').on('touchstart', function() {
			if ((!$(event.target).closest('#layer-control').length) && ($('#layer-control').hasClass('leaflet-control-layers-expanded'))) {
				$('#layer-control').removeClass('leaflet-control-layers-expanded');
			}
		});

		return tmBaseMapLayers[dflt];
	}

	function initCesiumViewer () {

		var defaultBaseMapLayer = populateBaseMapLayerControl();

    Cesium.Ion.defaultAccessToken = tmConstants.CESIUM_ACCESS_TOKEN;

		viewer = new Cesium.Viewer('globe', {
							// scene3DOnly: true,
							baseLayerPicker: false,
							imageryProvider: new Cesium.UrlTemplateImageryProvider({
								url: defaultBaseMapLayer.layerUrl,
								maximumLevel: defaultBaseMapLayer.maxZoom,
								credit: defaultBaseMapLayer.attribution
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
							scene3DOnly: true,
							creditContainer: 'creditContainer'
							});

		/* var terrainProvider = new Cesium.CesiumTerrainProvider({
			url : 'https://assets.agi.com/stk-terrain/world',
			requestWaterMask : false,
			requestVertexNormals : true
		}); */

    var terrainProvider = Cesium.createWorldTerrain();

		var removeHandler = viewer.scene.postRender.addEventListener(function () {
			$('#loadingOverlay').hide();
			$('#loadingSpinner').spin(false);
			removeHandler.call();
		});

		viewer.terrainProvider = terrainProvider;
		return viewer;
	}

	function layout3DTrackMarkers (tracks) {
		// Populate track markers
		for (var tId in tracks) {
			viewer.entities.add({
				id: tId,
				name: tId,
				position : Cesium.Cartesian3.fromDegrees(tracks[tId].trackLatLng[1], tracks[tId].trackLatLng[0]),
				billboard: {
					image: 'images/l-marker.png',
					scale: 0.8
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
		handle3DClickEvents(tracks);
	}

	function handle3DClickEvents(tracks) {
		var drillPickLimit = isMobile ? 1 : undefined;

		// On click open pop up
		$('#globe').on('click touchstart', function (e) {

			function positionPopUp (c) {
				var x = c.x - ($('#trackPopUpContent').width()) / 2;
				var y = c.y - ($('#trackPopUpContent').height());
				$('#trackPopUpContent').css('transform', 'translate3d(' + x + 'px, ' + y + 'px, 0)');
			}

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
					var savedEntity;
					if (entity instanceof Cesium.Entity) {
						if (entity.id.substring(0, 3) === 'pic') {
							$('[geoTagXRef=' + entity.id.substring(4) + ']').click();
						} else {
							if (entity.name && tracks[entity.name]) {
								var br = '';
								if (!popUpCreated) {
									$('#trackPopUpLink').empty();
									popUpCreated = true;
								} else {
									br = '<br>';
								}
								$('#trackPopUpLink').append('<a class="trackLink" popUpTrackId="' + entity.name + '" href="#">' + br + tracks[entity.name].trackName + '</a>');
								savedEntity = entity;
							}
						}
					}
				}
			}

			if (popUpCreated) {
				$('.trackLink').off();
				$('.trackLink').click(function () {
					fsm3D.show3DTrack(tracks[$(this).attr('popUpTrackId')], tracks);
					return false;
				});
				$('#trackPopUp').show();
				positionPopUp(c); // Initial position at the place item picked
				var removeHandler = viewer.scene.postRender.addEventListener(function () {
					var changedC = Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, savedEntity.position.getValue(Cesium.JulianDate.now()));
					// If things moved, move the popUp too
					if ((c.x !== changedC.x) || (c.y !== changedC.y)) {
						positionPopUp(changedC);
						c = changedC;
					}
				});
				// PopUp close button event handler
				$('.leaflet-popup-close-button').click(function() {
					$('#trackPopUp').hide();
					$('#trackPopUpLink').empty();
					removeHandler.call();
					return false;
				});
			}
		});
	}

	function updateTrackMarkersHeight(tracks) {
		var tIds = [];
		var pos = [];
		for (var tId in tracks) {
			tIds.push(tId);
			pos.push(Cesium.Cartographic.fromDegrees(tracks[tId].trackLatLng[1], tracks[tId].trackLatLng[0]));
		}

		Cesium.sampleTerrain(viewer.terrainProvider, 14, pos).then(function (pos) {
			for (var i=0; i<tIds.length; i++) {
				viewer.entities.getById(tIds[i]).position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromRadians(pos[i].longitude, pos[i].latitude, pos[i].height));
			}
		});
	}

	// Enter Track state
	function goto3DTrack(event, from, to, t, tracks, leaveState) {
		// Remove old track datasources
		removeTrackDataSources();

		grabAndRender3DTrack (t, tmConfig.getVDPlayFlag(), (from === 'Init') ? false : true);
		$('.help3d').show();
		if (from === 'Init') {
			history.replaceState({trackId: t.trackId}, '', '?track=' + t.trackId + '&terrain=yes');
		} else {
			if (!leaveState) {
				history.pushState({trackId: t.trackId}, '', '?track=' + t.trackId + '&terrain=yes');
			}
		}
		if ($('#show-markers').is(':checked')) {
			showMarkers(tracks);
		} else {
			hideMarkers(tracks);
		}
		$('#overlay-layer-control').show();
		$('.leaflet-popup-close-button').click();
		setUpSocialButtons(t.trackName);
	}

	function removeTrackDataSources() {
		if (Cesium.defined(trackDataSource)) {
			viewer.dataSources.remove(trackDataSource, true);
			trackDataSource = undefined;
		}
		if (Cesium.defined(geoTagsDataSource)) {
			viewer.dataSources.remove(geoTagsDataSource, true);
			geoTagsDataSource = undefined;
		}
	}

	function grabAndRender3DTrack (track, autoPlay, fly) {
		$('#show-photos-label').hide();
		savedTrackMarkerEntity = viewer.entities.getById(track.trackId);
		var lGPX = omnivore.gpx(API_BASE_URL + '/v1/tracks/' + track.trackId + '/GPX', null).on('ready', function() {
			// First grab the GeoJSON data from omnivore
			var trackGeoJSON = {type: 'FeatureCollection', features: []};
			trackGeoJSON.features.push(tmUtils.extractSingleLineString(this.toGeoJSON()));

			viewer.dataSources.add(Cesium.CzmlDataSource.load(tmUtils.buildCZMLForTrack(trackGeoJSON, lGPX, track.trackType))).then(function(ds) {
				trackDataSource = ds; // Save this data source so that we can remove it when needed
				if (fly) {
					viewer.flyTo(ds, {duration: tmConstants.FLY_TIME});
				} else {
					viewer.zoomTo(ds);
				}
				viewer.clock.shouldAnimate = false;

				setUp3DTrackControls (trackGeoJSON, autoPlay);
			});

			// Set up track name in info box
			$('#infoPanel').empty();
			$('#infoPanel').append('<div class="leaflet-control info infoPanelContainer"></div>');
			buildTrackInfoPanel(track, trackGeoJSON, '#infoPanel>.infoPanelContainer', null, function(geoTags) {
				tmUtils.buildCZMLForGeoTags(geoTags, viewer, function (geoTagsCZML) {
					viewer.dataSources.add(Cesium.CzmlDataSource.load(geoTagsCZML)).then(function(gds) {
						geoTagsDataSource = gds;
						$('#show-photos-label').show();
						$('#show-photos').prop('checked', true);
						$('.slideShowContainer img').hover(
							function() {
								var ent = gds.entities.getById('picS-'+ $(this).attr('geoTagXRef'));
								if (ent) {
									$(this).css('border-color', tmConstants.SELECTED_THUMBNAIL_COLOR);
									ent.billboard.show = true;
									gds.entities.getById('pic-'+ $(this).attr('geoTagXRef')).billboard.show = false;
								}
							},
							function() {
								var ent = gds.entities.getById('picS-'+ $(this).attr('geoTagXRef'));
								if (ent) {
									$(this).css('border-color', '#fff');
									gds.entities.getById('pic-'+ $(this).attr('geoTagXRef')).billboard.show = true;
									ent.billboard.show = false;
								}
							}
						);
					});
				});
			});
			setUpInfoPanelEventHandling();
			$('.infoPanelTitle button').click(); // in 3D, start with info panel closed

			$('#terrain-control-2d').off();
			$('#terrain-control-2d').click(function() {
				window.location.href = '?track=' + track.trackId;
				return false;
			});
		});
	}

	function buildTrackInfoPanel(track, trackGeoJSON, container, picGeoTagCallback, doneWithThumbsCallback) {

		var trackMetrics = [0, 0, 0, Infinity];
		var imperial = (track.trackRegionTags.indexOf('US') === -1) ? false : true;
		var trackDate = 'Not Available';
		for (var i=0; i<trackGeoJSON.features.length; i++) {
			if (trackGeoJSON.features[i].geometry.type === 'LineString') {
				trackMetrics = tmUtils.calculateTrackMetrics(trackGeoJSON.features[i], trackMetrics);
				if (trackGeoJSON.features[i].properties.time) {
					trackDate = new Date(trackGeoJSON.features[i].properties.time).toString();
				}
			}
			if (trackGeoJSON.features[i].geometry.type === 'Point') {
				// If date not available from the LineString, try from one of the waypoints
				if (trackDate === 'Not Available') {
					if (trackGeoJSON.features[i].properties.time) {
						trackDate = new Date(trackGeoJSON.features[i].properties.time).toString();
					}
				}
			}
		}
		for (i=0; i<trackMetrics.length; i++) {
			trackMetrics[i] = trackMetrics[i].toFixed(2);
		}
		var infoPanelHTML = '';
		infoPanelHTML +=
			'<div class="infoPanelTitle">' +
				'<button class="close" aria-hidden="true">&times;</button>' +
				'<b>' + track.trackName + ' ' + (track.trackFav ? tmConstants.FAVORITE : '') + '</b>' +
			'</div>' +
			'<div class="infoPanelBody">' +
				'<div class="infoPanelDescription">' +
					'<hr><b>' + track.trackLevel + '</b><br>' +
					' <b>Length:</b> ' + (imperial ? ((Math.round(trackMetrics[0] * 62.1371) / 100) + 'mi') : (trackMetrics[0] + 'km')) +
					' - <b>Elevation Gain:</b> ' + (imperial ? ((Math.round(trackMetrics[1] * 3.28084)) + 'ft') : (trackMetrics[1] + 'm')) +
					' <b>Max Elevation:</b> ' + (imperial ? ((Math.round(trackMetrics[2] * 3.28084)) + 'ft') : (trackMetrics[2] + 'm')) +
					' <b>Min Elevation:</b> ' + (imperial ? ((Math.round(trackMetrics[3] * 3.28084)) + 'ft') : (trackMetrics[3] + 'm')) +
					'<br><b>Region:</b> ' + track.trackRegionTags + '<br><b>Date Recorded:</b> ' + trackDate +
					'<hr>' + track.trackDescription.replace(/$/mg,'<br>') + '<br><br><b>By: </b>' + track.username + '<hr>' +
					'<a href="' + API_BASE_URL + '/v1/tracks/' + track.trackId + '/GPX' + '" download>Download GPS track</a>' +
				'</div>';

		infoPanelHTML +='</div>';

		$(container).append(infoPanelHTML);
		if(track.hasPhotos) {
			appendThumbnails(track, picGeoTagCallback, doneWithThumbsCallback);
		}

	}

	function appendThumbnails(track, picGeoTagCallback, doneWithThumbsCallback) {
		// Tell lightbox to do a wraparound album and to show nav on touch devices
		lightbox.option({'wrapAround': true, 'alwaysShowNavOnTouchDevices': true});
		// Go get the geo tags and then put the pics on the map
		tmData.getGeoTags(track.trackId, function(data) {
			if (data.geoTags.trackPhotos) {
				var thumbnailsHTML = '<div class="slideShowContainer">';
				track.trackPhotos = data.geoTags.trackPhotos; // Add trackPhotos structure to track to allow editing
				// var photoLayerGroup = L.layerGroup();
				thumbnailsHTML += '<hr>';
				for (var k=0; k<data.geoTags.trackPhotos.length; k++) {
					if (data.geoTags.trackPhotos[k].picIndex === undefined) {
						data.geoTags.trackPhotos[k].picIndex = k;
					}
					thumbnailsHTML += '<a href="'+ API_BASE_URL + '/v1/tracks/' + track.trackId + '/picture/' +
											data.geoTags.trackPhotos[k].picIndex +
											'" data-lightbox="slideshow" data-title="' + data.geoTags.trackPhotos[k].picCaption + '"' +
											'><img  nopin="nopin" class="infoThumbs" geoTagXRef="' + data.geoTags.trackPhotos[k].picIndex +
											'" src="data:image/jpeg;base64,' + data.geoTags.trackPhotos[k].picThumbBlob + '" /></a>';
					if (picGeoTagCallback && data.geoTags.trackPhotos[k].picLatLng) {
						picGeoTagCallback(data.geoTags.trackPhotos[k]);
					}
				}

				thumbnailsHTML += '</div>';
				$('.infoPanelBody').append(thumbnailsHTML);
				if (doneWithThumbsCallback) {
					 doneWithThumbsCallback(data.geoTags);
				}
			}

		}, function(jqxhr, textStatus) {console.log(textStatus);});
	}

	function setUp3DTrackControls (trackGeoJSON, autoPlay) {

		var trailHeadHeight = trackGeoJSON.features[0].geometry.coordinates[0][2];

		// Set up play/pause functionality
		$('#vd-play').show();
		$('#vd-play').off();
		viewer.clock.onTick.removeEventListener(clockTracker);
		readyToPlayButtonState();
		$('#vd-play').click(function() {
			if (fsm3D.current !== 'Playing') {
				if (fsm3D.current === 'Paused') {
					fsm3D.resume(trackGeoJSON);
				} else {
					fsm3D.play(trackGeoJSON);
				}
			} else {
				fsm3D.pause();
			}
			return false;
		});

		setUp3DZoomControls(trailHeadHeight);

		// Refresh
		$('#globe-control-refresh').off();
		$('#globe-control-refresh').click(function() {
			fsm3D.refresh(trackGeoJSON);
			return false;
		});

		$('#vd-faster').off();
		$('#vd-faster').click(function () {
			viewer.clock.multiplier = viewer.clock.multiplier * 2;
			return false;
		});

		$('#vd-slower').off();
		$('#vd-slower').click(function () {
			viewer.clock.multiplier = viewer.clock.multiplier / 2;
			return false;
		});

		// Autoplay?
		if (autoPlay) {
			setTimeout(function () {
				$('#vd-play').click();
			}, tmConstants.AUTOPLAY_DELAY);
		}
	}

	function refresh3DTrack(event, from, to, trackGeoJSON) {
		viewer.clock.currentTime =
			Cesium.JulianDate.fromIso8601(trackGeoJSON.features[trackGeoJSON.features.length-1].
				properties.coordTimes[trackGeoJSON.features[trackGeoJSON.features.length-1].
					properties.coordTimes.length-1]);
		if (fsm3D.current !== 'Track') {
			fsm3D.finishPlay();
		}
		viewer.flyTo(trackDataSource, {duration: tmConstants.FLY_TIME});
	}

	//function showPhotoNear(position) {
		// TODO: open popup with picture near
		/* if (geoTagsDataSource) {
			for (var i=0; i<geoTagsDataSource.entities.values.length; i++) {

				// viewer.entities.getById(tIds[i]).position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromRadians(pos[i].longitude, pos[i].latitude, pos[i].height));
				// var grabbedHeight = Cesium.Cartographic.fromCartesian(position);
				var grabbedHeight = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position).height;
				// var grabbedHeight = Cesium.Cartographic.fromCartesian3(position);

				console.log(grabbedHeight);

				if (Cesium.Cartesian3.distance(geoTagsDataSource.entities.values[i].position.getValue(), position) < 100) {
					geoTagsDataSource.entities.values[i].billboard.show = true;
				} else {
					geoTagsDataSource.entities.values[i].billboard.show = false;
				}
			}
		} */

	//}

	function clockTracker(clock) {
		var rd = Cesium.JulianDate.secondsDifference(viewer.clock.stopTime, viewer.clock.startTime);
		var tl = Cesium.JulianDate.secondsDifference(viewer.clock.currentTime, viewer.clock.startTime);
		$('#progressBar .progress-bar').css('width', (100 * tl / rd) + '%');
		if (clock.currentTime.equals(clock.stopTime)) {
			fsm3D.finishPlay();
			// resetReplay();
		}
		//showPhotoNear(trackDataSource.entities.getById('track').position.getValue(clock.currentTime));
	}

	function resetPlay() {
		viewer.clock.shouldAnimate = false;
		viewer.trackedEntity = undefined;
		trackDataSource.entities.getById('track').billboard.show = false;
		readyToPlayButtonState();
		viewer.clock.onTick.removeEventListener(clockTracker);
	}

	function playingButtonState() {
		$('.help3d').hide();
		$('#progressBar').show();
		$('#vd-speed').show();
		$('#vd-play > span').removeClass('glyphicon-play');
		$('#vd-play > span').addClass('glyphicon-pause');
		$('#vd-play').addClass('blink');
	}

	function readyToPlayButtonState() {
		$('#progressBar').hide();
		$('#vd-speed').hide();
		$('#progressBar .progress-bar').css('width', '0%');
		$('.help3d').show();
		$('#vd-play > span').removeClass('glyphicon-pause');
		$('#vd-play > span').addClass('glyphicon-play');
		$('#vd-play').removeClass('blink');
	}

	function pausedButtonState() {
		$('#vd-play > span').removeClass('glyphicon-pause');
		$('#vd-play > span').addClass('glyphicon-play');
	}

	function startPlaying(event, from, to, trackGeoJSON) {
		if (viewer.clock.currentTime.equals(viewer.clock.stopTime) || (event === 'play')) {
			viewer.clock.currentTime = Cesium.JulianDate.fromIso8601(trackGeoJSON.features[0].properties.coordTimes[0]);
		}
		viewer.clock.onTick.addEventListener(clockTracker);

		playingButtonState();
		viewer.trackedEntity = trackDataSource.entities.getById('track');
		viewer.clock.shouldAnimate = true;
		trackDataSource.entities.getById('track').billboard.show = true;
	}

	function enterPauseMode() {
		viewer.clock.onTick.removeEventListener(clockTracker);
		viewer.clock.shouldAnimate = false;
		pausedButtonState();
	}

	function zoomInOut3D(isZoomIn, minHeight) {
		// Smooth zoom parameters -- geo nicer than linear
		var ratio = 0.5;
		var numInc = 20;
		var msInc = 20;

		var cameraHeight = viewer.camera.positionCartographic.height;
		var zoomDistance = ((Math.abs((cameraHeight - minHeight)))/(Math.sin(Math.abs(viewer.camera.pitch))))/2;
		var moveIncrement = zoomDistance * (1-ratio)/(1-Math.pow(ratio, numInc));

		var i = 0;
		var intrvl = setInterval(function() {
			if (isZoomIn) {
				viewer.camera.zoomIn(moveIncrement*(Math.pow(ratio, i)));
			} else {
				viewer.camera.zoomOut(moveIncrement*(Math.pow(ratio, i))/ratio);
			}
			if (i++ >= numInc) {
				clearInterval(intrvl);
			}
		}, msInc);
	}

	function setUp3DZoomControls(minHeight) {
		// Set up zoom control click events
		$('.leaflet-control-zoom-in').off();
		$('.leaflet-control-zoom-in').click(function() {
			zoomInOut3D(true, minHeight);
			return false;
		});
		$('.leaflet-control-zoom-out').off();
		$('.leaflet-control-zoom-out').click(function() {
			zoomInOut3D(false, minHeight);
			return false;
		});
	}

	// Enter Globe state
	function gotoGlobe(event, from, to, initialCameraPosition, tracks, leaveState) {
		showMarkers(tracks);
		$('#overlay-layer-control').hide();
		setUp3DZoomControls(200);
		$('#vd-play').hide();
		$('#trackPopUp').hide();
		$('#infoPanel').empty();
		$('#terrain-control-2d').off('click');
		$('#terrain-control-2d').click(function () {
			window.location.href = './';
			return false;
		});
		$('#globe-control-refresh').off('click');
		$('#globe-control-refresh').click(function() {
			fsm3D.showGlobe(initialCameraPosition, tracks);
			return false;
		});
		if (from === 'Init') {
			history.replaceState({}, '', '?globe=yes');
		} else {
			if (!leaveState) {
				history.pushState({}, '', '?globe=yes');
			}
		}

		removeTrackDataSources();

		if (savedTrackMarkerEntity) {
			savedTrackMarkerEntity.show = true;
			savedTrackMarkerEntity = undefined;
		}
		viewer.camera.flyTo({
			destination : initialCameraPosition,
			duration: 2,
		});

		setUpMotdInfoBox(tracks, false, viewer);
		setUpSocialButtons(tmMessages.SOCIAL_DEFAULT_MSG);
	}

	function hideMarkers(tracks) {
		for (var tId in tracks) {
			viewer.entities.getById(tId).show = false;
		}
	}

	function showMarkers(tracks) {
		for (var tId in tracks) {
			viewer.entities.getById(tId).show = true;
			if (savedTrackMarkerEntity) {
				savedTrackMarkerEntity.show = false;
			}
		}
	}

	function showPhotoMarkers(isShow) {
		if (Cesium.defined(geoTagsDataSource)) {
			for (var i=0; i<geoTagsDataSource.entities.values.length; i++) {
				geoTagsDataSource.entities.values[i].show = isShow;
			}
		}
	}

	// Entry point for 3D visualization (both globe and track)
	var setUp3DView = function(tracks, track) {
		$('#map').hide();

		fsm3D = StateMachine.create({
			initial: 'Init',
			events: [
				{name: 'show3DTrack', from: ['Init', 'Track', 'Globe', 'Playing', 'Paused'], to: 'Track'},
				{name: 'showGlobe', from: ['Init', 'Globe', 'Track', 'Playing', 'Paused'], to: 'Globe'},
				{name: 'play', from: 'Track', to: 'Playing'},
				{name: 'finishPlay', from: ['Playing', 'Paused'], to: 'Track'},
				{name: 'pause', from: 'Playing', to: 'Paused'},
				{name: 'resume', from: 'Paused', to: 'Playing'},
				{name: 'refresh', from: ['Track', 'Playing', 'Paused'], to: 'Track'}
			],
			callbacks: {
				onbeforeshow3DTrack: goto3DTrack,
				onbeforeshowGlobe: gotoGlobe,
				onbeforeplay: startPlaying,
				onbeforefinishPlay: resetPlay,
				onbeforepause: enterPauseMode,
				onbeforeresume: startPlaying,
				onbeforerefresh: refresh3DTrack
			}
		});

		var viewer = initCesiumViewer();
		var initialCameraPosition = viewer.camera.position.clone();

		layout3DTrackMarkers(tracks);
		updateTrackMarkersHeight(tracks);

		$('#show-markers').change(function() {
			if ($(this).is(':checked')) {
				showMarkers(tracks);
			} else {
				hideMarkers(tracks);
			}
		});

		$('#show-photos').change(function() {
			if ($(this).is(':checked')) {
				showPhotoMarkers(true);
			} else {
				showPhotoMarkers(false);
			}
		});

		if (track) {
			fsm3D.show3DTrack(track, tracks);
		} else {
			fsm3D.showGlobe(initialCameraPosition, tracks);
		}

		window.onpopstate = function(event) {
			if (event.state) {
				if (event.state.trackId) {
					fsm3D.show3DTrack(tracks[event.state.trackId], tracks, true);
					return;
				} else {
					fsm3D.showGlobe(initialCameraPosition, tracks, true);
					return;
				}
			}
			// Handle all other back/forward situations with a reload
			window.location.reload();
		};

		$('#mapGlobeButton').click(function() {
			fsm3D.showGlobe(initialCameraPosition, tracks);
			return false;
		});
	};

	var setUpInfoPanelEventHandling = function () {
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

		// Event handling for expand/collapse on click
		var showToggle = true;
		// Give focus to the info panel to make it easy to use keyboard to scroll, if necessary
		$('.infoPanelContainer').focus();
		// Handle keyboard events
		$('.infoPanelContainer').on('keyup', function(e) {
			// Collapse info box on ESC or SPACE
			if ((e.keyCode === tmConstants.KEYCODE_ESC) || (e.keyCode === tmConstants.KEYCODE_SPACE)) {
				showToggle = collapseInfoPanel(showToggle, e);
			} else {
				// Let the info panel handle the other keys (like arrows and page-up/page-down), so stop propagation to the map
				e.stopPropagation();
			}
		});
		// Expand on title click
		$('.infoPanelTitle').on('click', function(e) {
			showToggle = expandInfoPanel(showToggle, e);
		});
		// Collapse on close button
		$('.infoPanelTitle button').on('click', function(e) {
			showToggle = collapseInfoPanel(showToggle, e);
		});
		// Ignore clicks on description to allow for copy and paste
		$('.infoPanelDescription').on('click', function(e) {
			e.stopPropagation();
		});
		// Close the info panel if clicked (or key pressed) on the map (cannot stop propagation because it breaks lightbox)
		$('#map').on('click keyup', function(e) {
			showToggle = collapseInfoPanel(showToggle, e, true);
		});
		$('#globe').on('click keyup touchstart', function(e) {
			showToggle = collapseInfoPanel(showToggle, e, true);
		});
	};

	var expandInfoPanel = function (toggle, e) {
		e.stopPropagation();
		if (!toggle) {
			$('.infoPanelBody').show();
			$('.infoPanelTitle button').show();
			$('.infoPanelTitle b').css('cursor', 'text');
			toggle = true;
		}
		return toggle;
	};

	var collapseInfoPanel = function (toggle, e, propagate) {
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
	};

	var setUpSocialButtons = function (text) {
		// Twitter
		$('.btn-twitter').attr('href', 'https://twitter.com/intent/tweet?text=' + text + '&url=' + encodeURIComponent(window.location.href) + '&via=jimmieangel' + '&hashtags=rikitraki');

		$('#fb-btn').off().click(function() {
			window.open('https://www.facebook.com/sharer/sharer.php?p[url]=' + encodeURIComponent(window.location.href), 'Share on facebook',
				'top=' + ((window.innerHeight / 2) - (350 / 2)) + ',left='+ ((window.innerWidth / 2) - (520 / 2)) + ',toolbar=0,status=0,width=' + 520 + ',height=' + 350);
			return false;
		});

		// Facebook
		/*$('#fb-btn').click(function() {
			FB.ui({
				method: 'feed',
				link: window.location.href,
				caption: text,
			}, function(){});
		  return false;
		}); */
	};

	return {
		setUpCommon: setUpCommon,
		setUpMap: setUpMap,
		setUpAllTracksView: setUpAllTracksView,
		setUpSingleTrackView: setUpSingleTrackView,
		setUp3DView: setUp3DView
	};
})();
