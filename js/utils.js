'use strict';
/* exported tmUtils */
/* globals L, Cesium, tmConstants */

var tmUtils = (function () {
	var calculateTrackMetrics = function(feature) {
		if (!Array.isArray(feature.geometry.coordinates)) {
			// Some gps tracks misbehave, so skip offending part
			return null;
		}
		var distance = 0;
		var elevation = 0;
		var maxElevation = 0;
		var minElevation = feature.geometry.coordinates[0][2];
		// Let smooth out the elevation data using a moving average
		var smoothElevation = smoothElevationData(feature);
		for (var i=0; i<feature.geometry.coordinates.length-1; i++) {
			distance +=  L.latLng(feature.geometry.coordinates[i][1], feature.geometry.coordinates[i][0]).
							distanceTo(L.latLng(feature.geometry.coordinates[i+1][1], feature.geometry.coordinates[i+1][0]));
			if (smoothElevation[i] < smoothElevation[i+1]) {
				// elevation += feature.geometry.coordinates[i+1][2] - feature.geometry.coordinates[i][2];
				elevation += smoothElevation[i+1] - smoothElevation[i];
			}
			if (feature.geometry.coordinates[i][2] > maxElevation) {
				maxElevation = feature.geometry.coordinates[i][2];
			}
			if (feature.geometry.coordinates[i][2] < minElevation) {
				minElevation = feature.geometry.coordinates[i][2];
			}
		}
		// One more to go for elevation
		if (feature.geometry.coordinates[i][2] > maxElevation) {
			maxElevation = feature.geometry.coordinates[i][2];
		}
		if (feature.geometry.coordinates[i][2] < minElevation) {
			minElevation = feature.geometry.coordinates[i][2];
		}
		return [(distance/1000).toFixed(2), elevation.toFixed(2), maxElevation.toFixed(2), minElevation.toFixed(2)];
	};

	// This private function attemps to reduce elevation data noise and elevation gain exageration by running a (WINDOW size) moving average
	var smoothElevationData = function(feature) {
		var WINDOW = 5;
		var smoothElevation = new Array(feature.geometry.coordinates.length);
		for (var i=0; i<feature.geometry.coordinates.length-1; i++) {
			var w = i < WINDOW ? i+1 : WINDOW;
			smoothElevation[i] = 0;
			for (var j = i - w + 1; j<=i; j++) {
				smoothElevation[i] += feature.geometry.coordinates[j][2];
			}
			smoothElevation[i] = smoothElevation[i] / w;
		}
		return smoothElevation;
	};

	var isValidEmail = function (email) {
 		var re = /\S+@\S+\.\S+/;
		return re.test(email);
	};

	var buildCZMLForTrack = function (trackGeoJSON, l) {
		console.log(l.getBounds().getNorth());

		// Remove all features except LineString (for now)
		var i = trackGeoJSON.features.length;
		while (i--) {
			if (trackGeoJSON.features[i].geometry.type !== 'LineString') {
				trackGeoJSON.features.splice(i, 1);
			}
		}

		// If we do not have timestamps, make them up
		if (!trackGeoJSON.features[0].properties.coordTimes) {
			trackGeoJSON.features[0].properties.coordTimes = [];
			var d = new Date(2015);
			for (i=0; i<trackGeoJSON.features[0].geometry.coordinates.length; i++) {
				trackGeoJSON.features[0].properties.coordTimes.push(d.toISOString());
				d.setSeconds(d.getSeconds() + 10);
			}
		}

		// Base structure for the CZML
		var trackCZML = [
			{
				id: 'document',
				name: 'CZML Track',
				version: '1.0',
				clock: {
					interval: trackGeoJSON.features[0].properties.coordTimes[0] + '/' + trackGeoJSON.features[0].properties.coordTimes[trackGeoJSON.features[0].properties.coordTimes.length-1],
					currentTime: trackGeoJSON.features[0].properties.coordTimes[0],
					multiplier: 100,
					range: 'CLAMPED',
					step: 'SYSTEM_CLOCK_MULTIPLIER'
				}
			},
			{
				id: 'track',
				availability: trackGeoJSON.features[0].properties.coordTimes[0] + '/' + trackGeoJSON.features[0].properties.coordTimes[trackGeoJSON.features[0].properties.coordTimes.length-1],
				path : {
					material : {
						polylineOutline: {
							color: {
								rgba: (Cesium.Color.fromCssColorString(tmConstants.INSIDE_TRACK_COLOR)).toBytes()
							},
							outlineColor: {
								rgba: (Cesium.Color.fromCssColorString(tmConstants.TRACK_COLOR)).toBytes()
							},
							outlineWidth: 5
						}
					},
					width: 7,
					leadTime: 0
				},
				billboard: {
						image: 'images/marker.png',
						verticalOrigin: 'BOTTOM',
						show: false
				},
				position: {
					cartographicDegrees: []
				},
				viewFrom: {
					'cartesian': [0, -1000, 300]
				}
			},
			{
				id: 'nw',
				description: 'invisible nw for camery fly',
				point: {
					color: {
						rgba: [0, 0, 0, 0]
					}
				},
				position: {cartographicDegrees: [l.getBounds().getWest(), l.getBounds().getNorth(), trackGeoJSON.features[0].geometry.coordinates[0][2]]}
			},
			{
				id: 'se',
				description: 'invisible se for camery fly',
				point: {
					color: {
						rgba: [0, 0, 0, 0]
					}
				},
				position: {cartographicDegrees: [l.getBounds().getEast(), l.getBounds().getSouth(), trackGeoJSON.features[0].geometry.coordinates[0][2]]}
			}
		];

		function keepSample(index) {
			trackCZML[1].position.cartographicDegrees.push(trackGeoJSON.features[0].properties.coordTimes[index]);
			trackCZML[1].position.cartographicDegrees.push(trackGeoJSON.features[0].geometry.coordinates[index][0]);
			trackCZML[1].position.cartographicDegrees.push(trackGeoJSON.features[0].geometry.coordinates[index][1]);
			trackCZML[1].position.cartographicDegrees.push(trackGeoJSON.features[0].geometry.coordinates[index][2]);
		}

		for (i=0; i<trackGeoJSON.features[0].geometry.coordinates.length; i++) {
			if (i === 0) {
				keepSample(i);
			} else {
				var cartPrev = Cesium.Cartesian3.fromDegrees(
					trackGeoJSON.features[0].geometry.coordinates[i-1][0],
					trackGeoJSON.features[0].geometry.coordinates[i-1][1],
					trackGeoJSON.features[0].geometry.coordinates[i-1][2]);
				var cartCurr = Cesium.Cartesian3.fromDegrees(
					trackGeoJSON.features[0].geometry.coordinates[i][0],
					trackGeoJSON.features[0].geometry.coordinates[i][1],
					trackGeoJSON.features[0].geometry.coordinates[i][2]);
				if (Cesium.Cartesian3.distance(cartCurr, cartPrev) > 10) {
					keepSample(i);
				}
			}
		}
		console.log(trackCZML);
		return trackCZML;

	};

	return {
		calculateTrackMetrics: calculateTrackMetrics,
		isValidEmail: isValidEmail,
		buildCZMLForTrack: buildCZMLForTrack
	};
})();
