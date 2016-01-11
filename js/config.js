'use strict';
/* exported tmConfig */

var tmConfig = (function () {
	// Development port numbers
	var DEV_WEB_PORT = '9000';
	var DEV_WS_PORT = '3000';

	// This function assumes that the api and the web page are colocated, if that is not the case it will need to be changed
	var getApiBaseUrl = function () {
		if (window.location.port === DEV_WEB_PORT) {
			return window.location.protocol + '//' + window.location.hostname + ':' + DEV_WS_PORT + '/api';
		}
		// Hosted in same nodejs container (local or remote)
		return window.location.protocol + '//' + window.location.host + '/api';
	};

	var getTrackId = function () {
		return getUrlVars().track;
	};

	var getRegion = function () {
		return decodeURIComponent((getUrlVars().region));
	};

	var getGlobeFlag = function () {
		return getUrlVars().globe === 'yes' ? true : false;
	};

	var getOverride = function () {
		return getUrlVars().override === 'yes' ? true : false;		
	};

	var getTerrainFlag = function () {
		return getUrlVars().terrain === 'yes' ? true : false;
	};

	var getLayers = function (f) {
		$.getJSON('config/layers.json', f).fail(function(jqxhr, textStatus, error) {throw error;});
		return f; //f is the function that is invoked when the data is ready
	};

	var getUrlVars = function () {
		var urlVars = [];
		var varArray = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for (var i = 0; i < varArray.length; i++) {
			var urlVar = varArray[i].split('=');
			urlVars[urlVar[0]] = urlVar[1];
		}
		return urlVars;
	};

	var getWebGlFlag = function () {
		// Basic test
		if (!window.WebGLRenderingContext) {
			return false;
		}
		// Ok basic test passed, but can WebGL be initialized?
		var c = document.createElement('canvas'); 
		var webglOptions = { 
			alpha : false, 
			stencil : false, 
			failIfMajorPerformanceCaveat : true
		};
		var gl = c.getContext('webgl', webglOptions) || c.getContext('experimental-webgl', webglOptions) || undefined; 
		if (!gl) { 
			return false; 
		} 
		// This will catch some really crappy versions like IE on virtualized environment
		if (gl.getSupportedExtensions().indexOf('OES_standard_derivatives') < 0) {
			return false;
		}
		// If I got here, it WebGL "should" be supported
		return true; 
	};

	// tmConfig public API
	return {
		getApiBaseUrl: getApiBaseUrl,
		getTrackId: getTrackId,
		getRegion: getRegion,
		getGlobeFlag: getGlobeFlag,
		getOverride: getOverride,
		getTerrainFlag: getTerrainFlag,
		getLayers: getLayers,
		getUrlVars: getUrlVars,
		getWebGlFlag: getWebGlFlag
	};
})();
