'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmConfig */

var tmConfig = {
	getTrackId: function () {
		var pos = location.search.search('track=');
		if (pos === -1) {
			return "";
		} else {
			return location.search.substr(pos+6);
		}
	},
	getLayers: function (f) {
		$.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error;});
		return f; //f is the function that is invoked when the data is ready
	}
};