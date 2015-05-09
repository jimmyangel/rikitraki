'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmConfig */

var tmConfig = {
	getLayers: function () {
		var layers = [
			{
				layerName: 'Thunder Forest Outdoors Base Map',
				layerUrl: 'http://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png',
				attribution: '&copy; <a href="http://www.opencyclemap.org">OpenCycleMap</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			},
			{
				layerName: 'ESRI World Imagery Base Map',
				layerUrl: 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
			}
		]; 
		return layers;
	},
	getTrackId: function () {
		return parseInt(location.search.substr(location.search.search('track=')+6));
	},
	getLayersF: function (f) {

		// $.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error});
		$.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error;});

		return f;
	}
};