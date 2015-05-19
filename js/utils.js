'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmUtils */

var tmUtils = {
	calculateTrackMetrics: function(feature) {
		var distance = 0;
		var elevation = 0;
		var maxElevation = 0;
		var minElevation = feature.geometry.coordinates[0][2];
		var i = 0;
		for (i=0; i<feature.geometry.coordinates.length-1; i++) {
			distance +=  L.latLng(feature.geometry.coordinates[i][1], feature.geometry.coordinates[i][0]).
							distanceTo(L.latLng(feature.geometry.coordinates[i+1][1], feature.geometry.coordinates[i+1][0]));
			if (feature.geometry.coordinates[i][2] < feature.geometry.coordinates[i+1][2]) {
				elevation += feature.geometry.coordinates[i+1][2] - feature.geometry.coordinates[i][2];
			}
			if (feature.geometry.coordinates[i][2] > maxElevation) {
				maxElevation = feature.geometry.coordinates[i][2]
			}
			if (feature.geometry.coordinates[i][2] < minElevation) {
				minElevation = feature.geometry.coordinates[i][2]
			}
		}
		// One more to go for elevation
		if (feature.geometry.coordinates[i][2] > maxElevation) {
			maxElevation = feature.geometry.coordinates[i][2]
		}
		if (feature.geometry.coordinates[i][2] < minElevation) {
			minElevation = feature.geometry.coordinates[i][2]
		}	
		return [(distance/1000).toFixed(2), elevation.toFixed(2), maxElevation.toFixed(2), minElevation.toFixed(2)];
	}
}