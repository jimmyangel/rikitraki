'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmData */

var tmData = {
	getTrackInfo: function (successCallback) {
		// $.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error});
		$.getJSON('data/tracks.json', successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getGeoTags: function (tId, successCallback, errorCallback) {
		// $.getJSON('data/' + tId + '/photos/geotags.json', successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
		$.getJSON('data/' + tId + '/photos/geotags.json', successCallback).fail(errorCallback);
	},
	getMotd: function (successCallback) {
		$.getJSON('data/motd.json', successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	}
};