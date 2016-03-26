'use strict';
/* exported tmData */
/* globals API_BASE_URL */

var tmData = (function () {

	var getTrackInfo = function (successCallback) {
		var filter = localStorage.getItem('rikitraki-filter');
		filter = (filter) ? ('/?filter=' + filter) : ('');
		$.getJSON(API_BASE_URL + '/v1/tracks' + filter, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	};

	var getNumberOfTracks = function (filter, successCallback) {
		// var filter = localStorage.getItem('rikitraki-filter');
		filter = (filter) ? ('/?filter=' + filter) : ('');
		$.getJSON(API_BASE_URL + '/v1/tracks/number' + filter, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	};

	var getGeoTags = function (tId, successCallback, errorCallback) {
		$.getJSON(API_BASE_URL + '/v1/tracks/' + tId + '/geotags/', successCallback).fail(errorCallback);
	};

	var getGeoTagsF = function (tId, successCallback, errorCallback) {
		return $.getJSON(API_BASE_URL + '/v1/tracks/' + tId + '/geotags/', successCallback).fail(errorCallback);
	};

	var getMotd = function (successCallback) {
		$.getJSON(API_BASE_URL + '/v1/motd', successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	};

	var getJWTToken = function (username, password, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/token',
			type: 'GET',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			success: successCallback,
			error: errorCallback
		});
	};

	var registerUser = function (reg, successCallback, errorCallback) {
		reg.rturl = location.href.split('?')[0];
		$.ajax({
			url: API_BASE_URL + '/v1/users',
			type: 'POST',
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	};

	var addInvitation = function (reg, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/invitation',
			type: 'POST',
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	};

	var updateUserProfile = function (reg, username, password, successCallback, errorCallback) {
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
	};

	var requestPasswordResetToken = function (email, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/resettoken',
			type: 'GET',
			data: {email: email, rturl: location.href.split('?')[0]},
			success: successCallback,
			error: errorCallback
		});
	};

	var removeUserProfile = function (username, password, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/users/me',
			type: 'DELETE',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			success: successCallback,
			error: errorCallback
		});
	};

	var addTrack = function (trk, token, successCallback, errorCallback) {
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
	};

	var uploadTrackPic = function (file, tId, picIndex, token) {
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
	};

	var updateTrack = function (trk, token, successCallback, errorCallback) {
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
	};

	var removeTrack = function (trackId, token, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/tracks/' + trackId,
			type: 'DELETE',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			success: successCallback,
			error: errorCallback
		});
	};

	var deleteTrackPic = function (tId, picIndex, token) {
		return $.ajax({
			url: API_BASE_URL + '/v1/tracks/' + tId + '/' + 'picture/' + picIndex,
			type: 'DELETE',
			headers: {
				'Authorization': 'JWT ' + token
			 },
			success: function() {}
		});
	};

	// tmData public API
	return {
		getTrackInfo: getTrackInfo,
		getNumberOfTracks: getNumberOfTracks,
		getGeoTags: getGeoTags,
		getGeoTagsF: getGeoTagsF,
		getMotd: getMotd,
		getJWTToken: getJWTToken,
		registerUser: registerUser,
		addInvitation: addInvitation,
		updateUserProfile: updateUserProfile,
		requestPasswordResetToken: requestPasswordResetToken,
		removeUserProfile: removeUserProfile,
		addTrack: addTrack,
		uploadTrackPic: uploadTrackPic,
		updateTrack: updateTrack,
		removeTrack: removeTrack,
		deleteTrackPic: deleteTrackPic
	};

})();
