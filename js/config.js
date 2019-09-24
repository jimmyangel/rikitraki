'use strict';

export var tmConfig = {
  	getApiBaseUrl: function () {
  		return 'http://localhost:3000/api';
      // return 'https://services.rikitraki.com/api';
  	},
  	getTrackId: function () {
  		return this.getUrlVars().track;
  	},
  	getRegion: function () {
  		return decodeURIComponent((this.getUrlVars().region));
  	},
  	getGlobeFlag: function () {
  		return this.getUrlVars().globe === 'yes' ? true : false;
  	},
  	getOverride: function () {
  		return this.getUrlVars().override === 'yes' ? true : false;
  	},
  	getTerrainFlag: function () {
  		return this.getUrlVars().terrain === 'yes' ? true : false;
  	},

  	getVDPlayFlag: function () {
  		return this.getUrlVars().vdplay === 'yes' ? true : false;
  	},
  	getUrlVars: function () {
  		var urlVars = [];
  		var varArray = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  		for (var i = 0; i < varArray.length; i++) {
  			var urlVar = varArray[i].split('=');
  			urlVars[urlVar[0]] = urlVar[1];
  		}
  		return urlVars;
  	},
  	getWebGlFlag: function () {
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
  	}
}

export var tmConstants = {
	TRAIL_MARKER_COLOR: '7A5C1E',
	WAYPOINT_COLOR: '#3887BE',
	TRACK_COLOR: '#8D6E27',
	INSIDE_TRACK_COLOR: '#EBEB00',
	SELECTED_THUMBNAIL_COLOR: '#00FF00',
	FAVORITE: '&#10029;',
	KEYCODE_ESC: 27,
	KEYCODE_SPACE: 32,
	CAMERA_OFFSET: 6000,
	FLY_TIME: 2,
	MIN_SAMPLE_DISTANCE: 10,
	AUTOPLAY_DELAY: 5000,
  CESIUM_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwMzE3NzI4MC1kM2QxLTQ4OGItOTRmMy1jZjNiMzgyZWNjMTEiLCJpZCI6ODMxLCJpYXQiOjE1MjU5Nzg4MDN9.Aw5ul-R15-PWF1eziTS9fOffIMjm02TL0eRtOD59v2s'

};

export var tmMessages = {
  VALID_USERNAME_PASSWORD: 'Please enter valid username and password',
  ACCOUNT_MUST_BE_ACTIVATED: 'Account must be activated before use. Please check your email',
  UNEXPECTED_ERROR: 'Oops! An unexpected error occurred. Please try again later',
  ENTER_EMAIL: 'Please enter a valid email',
  NO_EMAIL_FOUND: 'No record found for this email address',
  USERNAME_EMAIL_EXIST: 'Username or email already exist',
  VALID_USERNAME: 'Username must be 6 to 40 characters and have no special characters',
  VALID_PASSWORD: 'Password must be between 6 and 18 characters long',
  REPASSWORD_MATCH: 'Re-entered password must match password',
  SELECT_GPX: 'Please select a GPX file for this track (up to 4MB size)',
  ENTER_TRACK_NAME: 'Please enter a name for this track',
  ENTER_TRACK_DESCRIPTION: 'Please enter a description for this track',
  SELECT_REGION: 'Please select a region for this track',
  VALID_NUMBER: 'Please enter a valid number',
  SELECT_GOOD_GPX: 'Please select a "good" GPX file (valid format with at least a track segment with elevation data)',
  SAVE_ERROR: 'Save error, status ',
  DELETE_PIC_ERROR: 'Delete picture error, status ',
  UPLOAD_PIC_ERROR: 'Upload picture error, status ',
  REMOVE_ERROR: 'Remove error, status ',
	SOCIAL_DEFAULT_MSG: 'Check our GPS tracks on RikiTraki'
};

export var tmBaseMapLayers = [
		{
			layerName: 'ESRI World Topo',
			layerUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
			attribution: 'Tiles © Esri — Source: <a href="http://www.arcgis.com/home/item.html?id=30e5fe3149c34df1ba922e6f5bbf808f">ArcGIS World Topographic Map</a>',
			maxZoom: 19
		},
		{
			layerName: 'Thunder Forest Outdoors',
			layerUrl: 'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=c3fa9edd920b4974b82703cf9d296359',
			attribution: '© <a href="http://www.thunderforest.com/">Thunderforest</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 17
		},
		{
			layerName: 'OpenStreetMap',
			layerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			maxZoom: 19

		},
		{
			layerName: 'ESRI World Imagery',
			layerUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
			maxZoom: 19,
			default3D: true
		},
		{
			layerName: 'USGS USA Topo',
			layerUrl: 'https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',
			attribution: '<a href="https://www.doi.gov">U.S. Department of the Interior</a> | <a href="http://www.usgs.gov">U.S. Geological Survey</a> | <a href="http://www.usgs.gov/laws/policies_notices.html">Policies</a>',
			maxZoom: 15
		},
		{
			layerName: 'ArcGIS USA Topo Maps',
			layerUrl: 'https://services.arcgisonline.com/arcgis/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}',
			attribution: 'Esri, DeLorme, FAO, USGS, NOAA, EPA | © 2013 National Geographic Society, i-cubed',
			maxZoom: 15
		}
];

export var tmEmptyDBTracks = {
  tracks: {
    emptydb: {
        trackLatLng: [
            51.4934,
            0.0098
        ],
        trackRegionTags: [
            "United Kingdom",
            "London"
        ],
        trackLevel: "Easy",
        trackType: "Flying",
        trackFav: false,
        trackGPX: "none.gpx",
        trackName: "Empty Database",
        trackDescription: "The database has no tracks",
        hasPhotos: false,
        trackId: "emptydb",
        username: "nobody",
        isDraft: true
    }
  }
}
