'use strict';

export var tmData = {
	getTrackInfo: function (successCallback) {
		var filter = localStorage.getItem('rikitraki-filter');
		filter = (filter) ? ('&filter=' + encodeURIComponent(filter)) : ('');
		$.getJSON(APIV2_BASE_URL + '/tracks?proj=small' + filter, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getNumberOfTracks: function (filter, successCallback) {
		// var filter = localStorage.getItem('rikitraki-filter');
		filter = (filter) ? ('?filter=' + encodeURIComponent(filter)) : ('');
		$.getJSON(APIV2_BASE_URL + '/tracks/number' + filter, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getGeoTags: function (tId, successCallback, errorCallback) {
		$.getJSON(APIV2_BASE_URL + '/tracks/' + tId + '/geotags', successCallback).fail(errorCallback);
	},
	getTrackInfoDetail: function (track, successCallback) {
		if (track.trackDescription) {
		successCallback(track)
		} else {
		$.getJSON(APIV2_BASE_URL + '/tracks/' + track.trackId, successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
		}
	},

	getMotd: function (successCallback) {
		$.getJSON(APIV2_BASE_URL + '/motd', successCallback).fail(function(jqxhr, textStatus, error) {throw error;});
	},
	getJWTToken: function (username, password, successCallback, errorCallback) {
		$.ajax({
			url: APIV2_BASE_URL + '/token',
			type: 'GET',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			success: successCallback,
			error: errorCallback
		});
	},
	registerUser: function (reg, successCallback, errorCallback) {
		reg.rturl = location.href.split('?')[0];
		$.ajax({
			url:  APIV2_BASE_URL + '/users',
			type: 'POST',
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	/* addInvitation: function (reg, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/invitation',
			type: 'POST',
			data: JSON.stringify(reg),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	}, */
	updateUserProfile: function (reg, username, password, successCallback, errorCallback) {
		$.ajax({
			url: APIV2_BASE_URL + '/users/me',
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
			url: APIV2_BASE_URL + '/resettoken',
			type: 'GET',
			data: {email: email, rturl: location.href.split('?')[0]},
			success: successCallback,
			error: errorCallback
		});
	},
	/* removeUserProfile: function (username, password, successCallback, errorCallback) {
		$.ajax({
			url: API_BASE_URL + '/v1/users/me',
			type: 'DELETE',
			headers: {
				'Authorization': 'Basic ' + btoa(username + ':' + password)
			 },
			success: successCallback,
			error: errorCallback
		});
	}, */
	addTrack: function (trk, token, successCallback, errorCallback) {
		$.ajax({
			url: APIV2_BASE_URL + '/tracks',
			type: 'POST',
			headers: {
				'Authorization': 'Bearer ' + token
			 },
			data: JSON.stringify(trk),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	uploadTrackPic: function (file, tId, picIndex, token) {
		return $.ajax({
			url: APIV2_BASE_URL + '/tracks/' + tId + '/' + 'picture/' + picIndex,
			type: 'POST',
			headers: {
				'Authorization': 'Bearer ' + token
			 },
			data: file,
			processData: false,
			contentType: 'image/jpeg',
			success: function() {}
		});
	},
	updateTrack: function (trk, token, successCallback, errorCallback) {
		$.ajax({
			url: APIV2_BASE_URL + '/tracks/' + trk.trackId,
			type: 'PUT',
			headers: {
				'Authorization': 'Bearer ' + token
			 },
			data: JSON.stringify(trk),
			contentType: 'application/json; charset=utf-8',
			success: successCallback,
			error: errorCallback
		});
	},
	removeTrack: function (trackId, token, successCallback, errorCallback) {
		$.ajax({
			url: APIV2_BASE_URL + '/tracks/' + trackId,
			type: 'DELETE',
			headers: {
				'Authorization': 'Bearer ' + token
			 },
			success: successCallback,
			error: errorCallback
		});
	},
	deleteTrackPic: function (tId, picIndex, token) {
		return $.ajax({
			url: APIV2_BASE_URL + '/tracks/' + tId + '/' + 'picture/' + picIndex,
			type: 'DELETE',
			headers: {
				'Authorization': 'Bearer ' + token
			 },
			success: function() {}
		});
	}
}
