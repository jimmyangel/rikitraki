'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmConfig */

var tmConfig = {
	getTrackId: function () {
		return tmConfig.getUrlVars().track;
	},
	getRegion: function () {
		return decodeURIComponent((tmConfig.getUrlVars().region));
	},
	getLayers: function (f) {
		$.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error;});
		return f; //f is the function that is invoked when the data is ready
	},
	getUrlVars: function () {
		var urlVars = [];
		var varArray = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for (var i = 0; i < varArray.length; i++) {
			var urlVar = varArray[i].split('=');
			urlVars[urlVar[0]] = urlVar[1];
		}
		return urlVars;
	}
};