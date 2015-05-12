'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmData */

var tmData = {

	getTrackInfo: function (f) {
		// $.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error});
		$.getJSON('data/tracks.json', f).fail(function(jqxhr, textStatus, error) {throw error;});

		return f;
	}
};