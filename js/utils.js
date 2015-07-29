'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmUtils */
/* globals L */


var tmUtils = {
	calculateTrackMetrics: function(feature) {
		var distance = 0;
		var elevation = 0;
		var maxElevation = 0;
		var minElevation = feature.geometry.coordinates[0][2];
		// Let smooth out the elevation data using a moving average
		var smoothElevation = this.smoothElevationData(feature);
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
	},
	// This function attemps to reduce elevation data noise and elevation gain exageration by running a (WINDOW size) moving average
	smoothElevationData: function(feature) {
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
	}
};