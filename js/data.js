'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmData */
/* globals API_BASE_URL */

var tmData = {
	getTrackInfo: function (successCallback) {
		var filter = localStorage.getItem('rikitraki-filter');
		filter = (filter) ? ('/?filter=' + filter) : ('');
		$.getJSON(API_BASE_URL + '/v1/tracks' + filter, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getNumberOfTracks: function (filter, successCallback) {
		// var filter = localStorage.getItem('rikitraki-filter');
		filter = (filter) ? ('/?filter=' + filter) : ('');
		$.getJSON(API_BASE_URL + '/v1/tracks/number' + filter, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getGeoTags: function (tId, successCallback, errorCallback) {
		$.getJSON(API_BASE_URL + '/v1/tracks/' + tId + '/geotags/', successCallback).fail(errorCallback);
	},
	getMotd: function (successCallback) {
		$.getJSON(API_BASE_URL + '/v1/motd', successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getJWTToken: function (username, password, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/token',
			type: 'GET',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			success: successCallback,
			error: errorCallback
		});
	},
	registerUser: function (reg, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/users',
			type: 'POST',
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	addInvitation: function (reg, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/invitation',
			type: 'POST',
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	validateEmail: function (email, successCallback, errorCallback) {
		$.ajax({
			url: 'https://api.mailgun.net/v3/address/validate',
			type: 'GET',
			data: {address: email},
			username: 'api',
			password: 'pubkey-006969454903b02211a68c07550724b2',
			dataType: 'jsonp',
			success: successCallback,
			error: errorCallback
		});		
	},
	updateUserProfile: function (reg, username, password, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/users/me',
			type: 'PUT',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	requestPasswordResetToken: function (email, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/resettoken',
			type: 'GET',
			data: {email: email, rturl: location.href.split('?')[0]},
			success: successCallback,
			error: errorCallback
		});
	},
	removeUserProfile: function (username, password, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/users/me',
			type: 'DELETE',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			success: successCallback,
			error: errorCallback
		});
	},
	addTrack: function (trk, token, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/tracks',
			type: 'POST',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			data: JSON.stringify(trk),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	uploadTrackPic: function (file, tId, picIndex, token) {
		return $.ajax({
			url: API_BASE_URL + '/v1/tracks/' + tId + '/' + 'picture/' + picIndex,
			type: 'POST',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			data: file,
			processData: false,
			contentType: 'image/jpeg',
			success: function() {}
		});
	},
	updateTrack: function (trk, token, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/tracks/' + trk.trackId,
			type: 'PUT',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			data: JSON.stringify(trk),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	removeTrack: function (trackId, token, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/tracks/' + trackId,
			type: 'DELETE',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			success: successCallback,
			error: errorCallback
		});
	},
	deleteTrackPic: function (tId, picIndex, token) {
		return $.ajax({
			url: API_BASE_URL + '/v1/tracks/' + tId + '/' + 'picture/' + picIndex,
			type: 'DELETE',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			success: function() {}
		});		
	}
};