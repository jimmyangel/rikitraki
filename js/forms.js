'use strict';

var jquery = require('jquery');
window.$ = window.jQuery = jquery;

import {tmMessages} from './config.js';
import {tmUtils} from './utils.js';
import {tmData} from './data.js';

require('exif-js');
require('blueimp-canvas-to-blob');
var crs = require('country-region-selector');
require('country-region-selector/dist/jquery.crs.js');
require ('../bower_components/Sortable/jquery.fn.sortable.min.js');

export var tmForms = (function () {

	var MAX_IMAGE_SIZE = 1000000;
	var IMAGE_RESIZE_WIDTH = 1200;
	var IMAGE_RESIZE_QUALITY = 0.8;
	var THUMB_RESIZE_QUALITY = 0.5;
	var THUMBNAIL_WIDTH = 300;
	var MAX_NUM_IMAGES = 8;

	//---- Handle login, user registration and user profile forms
	var setUpUserForms = function () {
		// Enable filter button
		enableFilterButton();

		// Handle the user button (if token present, then user profile, otherwise login)
		if (localStorage.getItem('rikitraki-token')) {
			$('#hi-username').text(localStorage.getItem('rikitraki-username'));
			$('#user-btn').click(function() {
				$('#userModal').modal('show');
				return false;
			});
			// If user is logged in, then upload button needs to be be enabled
			enableUploadButton();
		} else {
			$('#user-btn').click(function() {
				$('#loginModal').modal('show');
				return false;
			});
		}

		// Focus on first field of the form
		$('#loginModal').on('shown.bs.modal', function () {
    		$('#login-username').focus();
		});

		$('#loginTab').on('shown.bs.tab', function () {
    		$('#login-username').focus();
		});
		$('#registerTab').on('shown.bs.tab', function () {
    		$('#reg-username').focus();
		});

		// Login button handler
		$('#loginButton').click(function() {
			var username = $('#login-username').val();
			var password = $('#login-password').val();
			if (username === '' || password === '') {
				$('#loginError').show();
			} else {
				tmData.getJWTToken(username, password, function(data) {
					localStorage.setItem('rikitraki-token', data);
					localStorage.setItem('rikitraki-username', username);
					resetLoginDialog();
					$('#user-btn').off();
					$('#hi-username').text(localStorage.getItem('rikitraki-username'));
					$('#user-btn').click(function() {
						$('#userModal').modal('show');
						return false;
					});
					enableUploadButton();
				}, function(jqxhr) { // jqxhr, textStatus
					console.log(jqxhr.status);
					if (jqxhr.status === 401) {
						// $('#loginErrorText').text('Please enter valid username and password');
						$('#loginErrorText').text(tmMessages.VALID_USERNAME_PASSWORD);
					} else {
						if (jqxhr.status === 403) {
							$('#loginErrorText').text(tmMessages.ACCOUNT_MUST_BE_ACTIVATED);
						} else {
							$('#loginErrorText').text(tmMessages.UNEXPECTED_ERROR);
						}
					}
					$('#loginError').show();
				});
			}
			return false;
		});

		// Forgot password button handler
		$('#forgotButton').click(function() {
			var email = $('#forgot-email').val();
			if (!tmUtils.isValidEmail(email)) {
				$('#forgot-email').next().addClass('glyphicon-remove');
				$('#forgot-email').focus();
				$('#forgotErrorText').text(tmMessages.ENTER_EMAIL);
				$('#forgotError').fadeIn('slow');
			} else {
				tmData.requestPasswordResetToken(email, function() {
					$('#forgotError').hide();
					$('#forgot-email').next().removeClass('glyphicon-remove');
					$('#forgotMessage').fadeIn('slow');
					setTimeout(function () {
						resetLoginDialog();
					}, 2000);
				}, function() { // jqxhr, textStatus
					$('#forgotErrorText').text(tmMessages.NO_EMAIL_FOUND);
					$('#forgotError').fadeIn('slow');
				});
			}
			return false;
		});

		// Register button handler
		$('#registerButton').click(function() {

			if (isValidForm('registration')) {
				var reg = {username: $('#reg-username').val(), email: $('#reg-email').val(), password: $('#reg-password').val()};
				tmData.registerUser(reg, function() {
					$('#registrationError').hide();
					$('#registrationMessage').fadeIn('slow');
					setTimeout(function () {
						resetLoginDialog();
					}, 2000);
				}, function(jqxhr) { // jqxhr, textStatus
					if (jqxhr.status === 422) {
						$('#registrationErrorText').text(tmMessages.USERNAME_EMAIL_EXIST);
					} else {
						$('#registrationErrorText').text(tmMessages.UNEXPECTED_ERROR);
					}
					$('#registrationError').fadeIn('slow');
					console.log(jqxhr);
				});
				return false;
			}
			return false;
		});

		// Logoff link handler
		$('#logoffLink').click(function () {
			logoff();
		});

		// Update profile button handler
		$('#update .form-control').on('input', function () {
			if ($(this).val() !== '') {
				$('#updateProfileButton').removeAttr('disabled');
			}
		});

		// Clear profile form upon closing
		$('#userModal').on('hidden.bs.modal', function () {
			resetUserDialog();
		});

		$('#updateProfileButton').click(function() {
			if (!isEmptyForm('profile')) {
				if (isValidForm('profile')) {
					var reg = {};
					var email = $('#usr-email').val();
					var password = $('#usr-password').val();
					if (email) {
						reg.email = email;
					}
					if (password) {
						reg.password = password;
					}
					tmData.updateUserProfile(reg, localStorage.getItem('rikitraki-username'), $('#usr-oldpassword').val(), function() {
						$('#profileMessage').fadeIn('slow');
						setTimeout(function () {
							$('#userModal').modal('hide');
						}, 2000);
					}, function(jqxhr) { // jqxhr, textStatus
						if (jqxhr.status === 401) {
							$('#profileErrorText').text('Please enter a valid password');
						} else {
							$('#profileErrorText').text(JSON.parse(jqxhr.responseText).description);
						}
						$('#profileError').show();
					});
					return false;
				}
			}
			return false;
		});

		// Remove profile button handler
		// Handle the removal button enable/disable
		$('#confirmRemoval').click(function() {
			if($(this).is(':checked')){
				$('#removeProfileButton').removeAttr('disabled');
			} else {
		        $('#removeProfileButton').attr('disabled', 'disabled');
		    }
		});

		// Handle the remove profile button
		$('#removeProfileButton').click(function() {
			tmData.removeUserProfile(localStorage.getItem('rikitraki-username'), $('#rem-password').val(), function() {
				$('#removeMessage').fadeIn('slow');
				setTimeout(function () {
					$('#userModal').modal('hide');
					logoff();
				}, 2000);
				return false;
			}, function(jqxhr) { // jqxhr, textStatus
				if (jqxhr.status === 401) {
					$('#removeProfileErrorText').text('Please enter a valid password');
					$('#removeProfileError').show();
				} else {
					// Add internal error message here
					console.log(jqxhr);
				}
			});
			return false;
		});
	};

	var formValidation = {
		registration: [
			{
				fieldId: '#reg-username',
				errorMsg: tmMessages.VALID_USERNAME,
			 	isValid: function () {
			 		var re = new RegExp('^[^~,;%\\`\'\"<>{}()\\[\\]/]*$'); // No special characters allowed
					if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val().length > 40) || !re.test($(this.fieldId).val())) {
						return false;
					} else {
						return true;
					}
				}
			},
			{
				fieldId: '#reg-email',
				errorMsg: tmMessages.ENTER_EMAIL,
			 	isValid: function () {
			 		return tmUtils.isValidEmail($(this.fieldId).val());
				}
			},
			{
				fieldId: '#reg-password',
				errorMsg: tmMessages.VALID_PASSWORD,
			 	isValid: function () {
					if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val().length > 18)) {
						return false;
					} else {
						return true;
					}
				}
			},
			{
				fieldId: '#reg-repassword',
				errorMsg: tmMessages.REPASSWORD_MATCH,
			 	isValid: function () {
					if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val() !== $('#reg-password').val())) {
						return false;
					} else {
						return true;
					}
				}
			}
		],
		profile: [
			{
				fieldId: '#usr-email',
				errorMsg: tmMessages.ENTER_EMAIL,
			 	isValid: function () {
			 		if ($(this.fieldId).val() === '') {
						return true;
					} else {
			 			return tmUtils.isValidEmail($(this.fieldId).val());
			 		}
				}
			},
			{
				fieldId: '#usr-oldpassword',
				errorMsg: tmMessages.VALID_PASSWORD,
			 	isValid: function () {
					if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val().length > 18)) {
						return false;
					} else {
						return true;
					}
				}
			},
			{
				fieldId: '#usr-password',
				errorMsg: tmMessages.VALID_PASSWORD,
			 	isValid: function () {
			 		if (($(this.fieldId).val() === '')) {
						return true;
					} else {
						if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val().length > 18)) {
							return false;
						} else {
							return true;
						}
					}
				}
			},
			{
				fieldId: '#usr-repassword',
				errorMsg: tmMessages.REPASSWORD_MATCH,
			 	isValid: function () {
			 		if (($(this.fieldId).val() === '') && ($('#usr-password').val() === '')) {
						return true;
					} else {
						if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val() !== $('#usr-password').val())) {
							return false;
						} else {
							return true;
						}
					}
				}
			}
		],
		upload: [
			{
				fieldId: '#track-file',
				errorMsg: tmMessages.SELECT_GPX,
			 	isValid: function () {
			 		if ($('#track-file')[0].files[0]) {
			 			if ($('#track-file')[0].files[0].size > 4000000) {
			 				return false;
			 			}
			 			return true;
			 		} else {
			 			return false;
			 		}
				}
			},
			{
				fieldId: '#track-name',
				errorMsg: tmMessages.ENTER_TRACK_NAME,
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
			 		// return (!($(this.fieldId).val() === ''));
				}
			},
			{
				fieldId: '#track-description',
				errorMsg: tmMessages.ENTER_TRACK_DESCRIPTION,
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
			 		// return !($(this.fieldId).val() === '');
				}
			},
			{
				fieldId: '#track-region',
				errorMsg: tmMessages.SELECT_REGION,
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
			 		// return !($(this.fieldId).val() === '');
				}
			},
			{
				fieldId: '#track-time-offset',
				errorMsg: tmMessages.VALID_NUMBER,
			 	isValid: function () {
			 		if (/^(\-|\+)?([0-9]{0,5}(\.[0-9]{0,5})?)$/.test($(this.fieldId).val())) {
			 			return !isNaN(parseFloat($(this.fieldId).val()));
			 		} else {
			 			return false;
			 		}
				}
			}
		],
		edit: [
			{
				fieldId: '#edit-track-name',
				errorMsg: tmMessages.ENTER_TRACK_NAME,
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
				}
			},
			{
				fieldId: '#edit-track-description',
				errorMsg: tmMessages.ENTER_TRACK_DESCRIPTION,
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
				}
			},
			{
				fieldId: '#edit-track-time-offset',
				errorMsg: tmMessages.VALID_NUMBER,
			 	isValid: function () {
			 		if (/^(\-|\+)?([0-9]{0,5}(\.[0-9]{0,5})?)$/.test($(this.fieldId).val())) {
			 			return !isNaN(parseFloat($(this.fieldId).val()));
			 		} else {
			 			return false;
			 		}
				}
			}
		]
	};

	var isValidForm = function (formName) {
		cleanupErrorMarks();
		for (var i = 0; i<formValidation[formName].length; i++) {
			if (!formValidation[formName][i].isValid()) {
				displayErrorMessage(formName, formValidation[formName][i].fieldId, formValidation[formName][i].errorMsg);
				return false;
			}
		}
		return true;
	};

	var isEmptyForm = function (formName) {
		for (var i = 0; i<formValidation[formName].length; i++) {
			if ($(formValidation[formName][i].fieldId).val() !== '') {
				return false;
			}
		}
		return true;
	};

	var displayErrorMessage = function (formName, fieldId, errorMessage) {
		$(fieldId).next().addClass('glyphicon-remove');
		$(fieldId).focus();
		$('#' + formName + 'ErrorText').text(errorMessage);
		$('#' + formName + 'Error').fadeIn('slow');
	};

	var resetLoginDialog = function () {
		$('#loginModal').modal('hide');
		$('#loginModal').find('form').trigger('reset');
		cleanupErrorMarks();
		$('#forgotMessage').hide();
		$('#loginTab').tab('show');
		$('#forgotPanel').collapse('hide');

	};

	var resetUserDialog = function () {
		// $('#userModal').modal('hide');
		$('#userModal').find('form').trigger('reset');
		cleanupErrorMarks();
		$('#profileMessage').hide();
		$('#removeMessage').hide();
		$('#updateProfileTab').tab('show');
		$('#updateProfileButton').attr('disabled', 'disabled');
	};

	var cleanupErrorMarks = function () {
		$('.alert').hide();
		$('.form-control').next().removeClass('glyphicon-remove');
	};

	var logoff = function () {
		// Remove token...
		localStorage.removeItem('rikitraki-token');
		localStorage.removeItem('rikitraki-username');
		// ...and reload the page
		window.location.href='';
	};

	var enableUploadButton = function () {
		$('#uploadEditContainer').append('<li><a role="button" id="upload-btn" title="Upload track" href="."><span class="glyphicon glyphicon-cloud-upload" aria-hidden="true"></span></a></li>');

		cleanupErrorMarks();
		$('#uploadTrackModal').find('form').trigger('reset');

		$('#upload-btn').click(function() {
			// Needed to fix crs annoying issue
			$('#track-country').attr('data-crs-loaded', 'false');
			crs.init();

			$('#uploadTrackModal').modal('show');
			return false;
		});

		// Replace standard file selector with custom button
		$('#selectUploadPhotos').click(function () {
			this.blur();
			$('#track-photo-files').click();
		});

		$('#phototsTab').click(function() {
			if (isValidForm('upload')) {
				return true;
			} else {
				return false;
			}
		});

		$('#uploadButton').click(function() {
			uploadTrack();
			return false;
		});

		$('#track-photo-files').change(function () {
			$('#track-photos-container').empty();
			var files = $('#track-photo-files')[0].files;
			for (var i=0; i<Math.min(files.length, MAX_NUM_IMAGES); i++) {
				$('#track-photos-container').append
					(
						'<div style="float: left;" orig-file-index="' + i + '">' +
						'<div><input type="text" maxLength="200" value="' +
						files[i].name.replace(/\.[^/.]+$/, '') +
						'"' + ' class="trackUploadThumbCaption form-control"></div><div><img class="img-responsive trackUploadThumbs" src="' +
						URL.createObjectURL(files[i]) +
						'"></div></div>'
					);
			}
			// Enable drag and drop sorting
			$('#track-photos-container').sortable();
		});
	};

	var uploadTrack = function () {
		var badGpxMsg = tmMessages.SELECT_GOOD_GPX;
		if (isValidForm('upload')) {
			var fReader = new FileReader();
			fReader.onload = function() {
				// We try to parse using omnivore to make sure a GPX file can be viewed later
				var layer;
				try {
					layer = omnivore.gpx.parse(fReader.result);
				} catch (e) {
					displayUploadError(badGpxMsg);
					return;
				}

				var singleLineString = tmUtils.extractSingleLineString(layer.toGeoJSON());

				// Must have a track to be valid
				if (singleLineString.geometry.coordinates.length === 0) {
					displayUploadError(badGpxMsg);
					return;
				}

				// Ok, looks like we have a valid GPX from here on
				$('#uploadingMessage').fadeIn('slow');
				$('#uploadSpinner').spin({left: '90%'});
				$('#uploadButton').attr('disabled', 'disabled');
				var track = {};
				track.trackLatLng = [singleLineString.geometry.coordinates[0][1], singleLineString.geometry.coordinates[0][0]];
				var country = $('#track-country').val();
				track.trackRegionTags = new Array((country === 'United States') ? 'US' : country, $('#track-region').val());
				track.trackLevel = $('.track-level:checked').val();
				track.trackType = $('#track-activity').val();
				track.trackFav = $('#track-favorite').is(':checked');
				track.trackGPX = $('#track-file')[0].files[0].name;
				track.trackName = $('#track-name').val();
				track.trackDescription = $('#track-description').val();
				track.trackGPXBlob = fReader.result;
				track.hasPhotos = false;
				makeTrackPhotos (singleLineString, function(trackPhotos) {
					if (trackPhotos.length > 0) {
						track.trackPhotos = trackPhotos;
						track.hasPhotos = true;
					}
					tmData.addTrack(track, localStorage.getItem('rikitraki-token'), function(data) {
						var files = $('#track-photo-files')[0].files;
						var images = $('#track-photos-container img');
						var resizeToBlobTasks = [];
						var uploadPictureTasks = [];
						for (var j=0; j<images.length; j++) {
							// Grab original file index (in case list was reordered)
							var i = $('#track-photos-container').children()[j].getAttribute('orig-file-index');
							// But first resize the image if it is big
							if (files[i].size > MAX_IMAGE_SIZE) {
								resizeToBlobTasks.push(resizeToBlob(data.trackId, images[j], j, uploadPictureTasks));
							} else {
								uploadPictureTasks.push(uploadPicture(data.trackId, j, files[i]));
							}
						}
						$.when.apply(this, resizeToBlobTasks).then(function () {
							$.when.apply(this, uploadPictureTasks).then(function () {
								$('#uploadingMessage').hide();
								$('#uploadMessage').fadeIn('slow');
								setTimeout(function () {
									window.location.href='?track=' + data.trackId;
								}, 2000);
							}, function (jqxhr) {
								displayUploadError('Upload image error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
								console.log(jqxhr);
							});
						});
					}, function(jqxhr) { // jqxhr, textStatus
						displayUploadError('Upload track error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
						console.log(jqxhr);
					});
				});
			};
			try {
				fReader.readAsText($('#track-file')[0].files[0]);
			} catch (e) {
				console.log(e);
			}
		}
	};

	var displayUploadError = function (message) {
		$('#trackInfoTab').tab('show');
		$('#uploadingMessage').hide();
		$('#uploadSpinner').spin(false);
		$('#uploadButton').removeAttr('disabled');
		displayErrorMessage('upload', '#track-file', message);
	};

	var makeTrackPhotos = function(trackLineString, callback) {
		var trackPhotos = [];
		var images = $('#track-photos-container img');
		var grabLatLonTasks = [];
		var timeOffset = parseFloat($('#track-time-offset').val());
		// Loop through images to set up trackPhotos object
		for (var i=0; i<images.length; i++) {
			trackPhotos.push({
				picName: i.toString(),
				picThumb: i.toString(),
				picCaption: $('#track-photos-container input')[i].value,
				picThumbDataUrl: resizeImage(images[i], THUMBNAIL_WIDTH).toDataURL('image/jpeg', THUMB_RESIZE_QUALITY)
			});

			// Extract geotags
			grabLatLonTasks.push(grabLatLon(trackLineString, timeOffset, images[i], trackPhotos[i]));
			// Keep things clean by releasing the object URLs
			URL.revokeObjectURL(images[i].src);
		}

		// Call back when all the lat lon tasks finish
		$.when.apply(this, grabLatLonTasks).then(function () {
			callback(trackPhotos);
		});
	};

	var grabLatLon = function (trackLineString, timeOffset, img, trackPhotos) {
		var d = $.Deferred();
		EXIF.getData(img, function () {
			var lat = EXIF.getTag(this, 'GPSLatitude');
			var lon = EXIF.getTag(this, 'GPSLongitude');

			// If we have lat and lon, grab them, we are done
			if (lat && lon) {
				var latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N';
				lat = (lat[0] + lat[1]/60 + lat[2]/3600) * (latRef === 'N' ? 1 : -1);
				var lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'W';
				lon = (lon[0] + lon[1]/60 + lon[2]/3600) * (lonRef === 'W' ? -1 : 1);
				trackPhotos.picLatLng = [lat, lon];
			} else {
				// No GPS info in EXIF, let try with the timestamp method (TODO: see if interpolation is worth it)
				if (trackLineString.properties.coordTimes) {
					var t1 = (new Date(trackLineString.properties.coordTimes[0])).getTime();
					var t2 = (new Date(trackLineString.properties.coordTimes[trackLineString.properties.coordTimes.length -1])).getTime();
					var pDateTime = EXIF.getTag(this, 'DateTimeOriginal');
					// Date has to exist and needs to be the correct format
					if (pDateTime && /^[0-9]{4}:[0-9][0-9]:[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]$/.test(pDateTime)) {
						var pDT = pDateTime.split(/ |:/);
						var tX = (timeOffset * 60 * 60 * 1000) + (new Date(pDT[0], parseInt(pDT[1])-1, pDT[2], pDT[3], pDT[4], pDT[5])).getTime();
						if ((tX >= t1) && (tX <= t2)) {
							for (var i=0; i<trackLineString.properties.coordTimes.length; i++) {
								if (tX <= (new Date(trackLineString.properties.coordTimes[i])).getTime()) {
									trackPhotos.picLatLng = [trackLineString.geometry.coordinates[i][1], trackLineString.geometry.coordinates[i][0]];
									break;
								}
							}
						}
					}
				}
			}
			d.resolve();
		});
		return d.promise();
	};

	var uploadPicture = function (trackId, picIndex, blob) {
		return tmData.uploadTrackPic(blob, trackId, picIndex, localStorage.getItem('rikitraki-token'));
	};

	var resizeToBlob = function (trackId, img, picIndex, uploadPictureTasks) {
		// This function makes a canvas.toBlob task for converting a resized image to jpeg for uploading
		var d = $.Deferred();
		resizeImage(img, IMAGE_RESIZE_WIDTH).toBlob(function (blob) {
				uploadPictureTasks.push(uploadPicture(trackId, picIndex, blob));
				d.resolve();
		},
		'image/jpeg', IMAGE_RESIZE_QUALITY);
		return d.promise();
	};

	var resizeImage = function (img, width) {
		var height;
		if ((width <= 0) || (img.naturalWidth <= width)) {
			// Do not resize if the image is already small
			width = img.naturalWidth;
			height = img.naturalHeight;
		} else {
			height = img.naturalHeight * (width / img.naturalWidth);
		}
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		var ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, width, height);

		// Return canvas with resized image
		return canvas;
	};

	var enableEditButton = function(track, tl) {

		if ((localStorage.getItem('rikitraki-token')) && (track.username === localStorage.getItem('rikitraki-username')))  {
			$('#uploadEditContainer').append('<li><a role="button" id="edit-btn" title="Edit track info" href="."><span class="glyphicon glyphicon glyphicon-edit" aria-hidden="true"></span></a></li>');
		} else {
			return;
		}

		var trackGeoJSON = tl.toGeoJSON();

		$('#edit-btn').click(function() {
			// Set current values on the form for editing
			$('#edit-track-name').val(track.trackName);
			$('#edit-track-description').val(track.trackDescription);
			$('#edit-track-activity').val(track.trackType ? track.trackType : 'Hiking'); // For compatibility with old data
			$('.edit-track-level[value=' + track.trackLevel + ']').prop('checked', true);
			if (track.trackFav) {
				$('#edit-track-favorite').prop('checked', true);
			}
			if (track.trackRegionTags[0]) {
				var country = track.trackRegionTags[0];
				$('#edit-track-country').attr('data-default-value', (country === 'US') ? 'United States' : country);

				// Needed to fix crs annoying issue
				$('#edit-track-country').attr('data-crs-loaded', 'false');
				crs.init();

				if (track.trackRegionTags[1]) {
					$('#edit-track-region').val(track.trackRegionTags[1]);
				}
			}

			$('#edit-track-photos-container').empty();
			if (track.trackPhotos) {
				for (var i=0; i<track.trackPhotos.length; i++) {
					$('#edit-track-photos-container').append (
						'<div style="float: left;" orig-photo-index="' + i + '">' +
						'<div><input type="text" maxLength="200" value="' + track.trackPhotos[i].picCaption +
						'"' + ' class="trackUploadThumbCaption form-control"></div><div><img class="img-responsive trackUploadThumbs" ' +
						'src="data:image/jpeg;base64,' + track.trackPhotos[i].picThumbBlob + '"></div></div>'
					);
				}
			}
			if ($('.infoThumbs').length < MAX_NUM_IMAGES) {
				$('#edit-track-file-selector').show();
			}

			// Enable drag and drop sorting
			$('#edit-track-photos-container').sortable({
				group: 'edit-photos'
			});
			// Enable drag to delete drop zone
			$('#edit-track-photos-delete-drop-zone').sortable({
				group: 'edit-photos',
				onAdd: function(evt) {evt.item.remove(); $('#edit-track-file-selector').show();}
			});

			$('#saveButton').removeAttr('disabled');

			$('#editTrackModal').modal('show');
			return false;
		});

		// Replace standard file selector with custom button
		$('#selectEditPhotos').click(function () {
			this.blur();
			$('#edit-track-photo-files').click();
		});

		// Add new photos to the container upon file selection change (always replace -- later: add instead)
		$('#edit-track-photo-files').change(function () {
			var files = $('#edit-track-photo-files')[0].files;
			$('.newImage').remove();
			var n = $('#edit-track-photos-container').children().length;
			for (var i=0; i<Math.min(files.length, MAX_NUM_IMAGES - n); i++) {
				$('#edit-track-photos-container').append (
					'<div class="newImage" style="float: left;" file-index="' + i + '">' +
					'<div><input type="text" maxLength="200" value="' +
					files[i].name.replace(/\.[^/.]+$/, '') +
					'"' + ' class="trackUploadThumbCaption form-control"></div><div><img class="img-responsive trackUploadThumbs" src="' +
					URL.createObjectURL(files[i]) +
					'"></div></div>'
				);
			}
			if (n+i >= MAX_NUM_IMAGES) {
				$('#edit-track-file-selector').hide();
			}
		});

		$('#saveButton').click(function() {
			saveEditedTrackInfo(track, trackGeoJSON);
			return false;
		});

		// Remove track button handler
		// Handle the removal button enable/disable
		$('#confirmTrackRemoval').click(function() {
			if($(this).is(':checked')){
				$('#removeTrackButton').removeAttr('disabled');
			} else {
		        $('#removeTrackButton').attr('disabled', 'disabled');
		    }
		});

		$('#removeTrackTab').click(function() {
			$('#saveButton').hide();
		});

		$('#editInfoTab, #editPhotosTab').click(function() {
			$('#saveButton').show();
		});

		// Handle the remove track button
		$('#removeTrackButton').click(function() {
			removeTrack(track.trackId);
			return false;
		});
	};

	var saveEditedTrackInfo = function(track, trackGeoJSON) {
		// Pick up the LineString feature
		var trackLineString;
		var i = 0;
		for (i=0; i<trackGeoJSON.features.length && trackGeoJSON.features[i].geometry.type !== 'LineString'; i++) {}
		// The below should always be true, but let's be defensive
		if (i<trackGeoJSON.features.length) {
			trackLineString = trackGeoJSON.features[i];
		}

		// A couple of private functions
		function deletePicture (picIndex) {
			return tmData.deleteTrackPic(track.trackId, picIndex, localStorage.getItem('rikitraki-token'));
		}

		function updateTrack(t) {
			tmData.updateTrack(t, localStorage.getItem('rikitraki-token'), function(data) {
				$('#savingMessage').hide();
				$('#editMessage').fadeIn('slow');
				setTimeout(function () {
					window.location.href='?track=' + data.trackId;
				}, 2000);
			}, function(jqxhr) { // jqxhr, textStatus
				displaySaveError('Save error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
				console.log(jqxhr);
			});
		}

		if (isValidForm('edit')) {
			$('#savingMessage').fadeIn('slow');
			$('#saveSpinner').spin({left: '90%'});
			$('#saveButton').attr('disabled', 'disabled');

			var timeOffset = parseFloat($('#edit-track-time-offset').val());
			var trackChanged = false;
			var fields = ['trackName', 'trackDescription', 'trackFav', 'trackLevel', 'trackType', 'trackRegionTags'];
			var t = {};
			t.trackId = track.trackId;
			t.trackName = $('#edit-track-name').val();
			t.trackDescription = $('#edit-track-description').val();
			t.trackFav = $('#edit-track-favorite').is(':checked');
			t.trackLevel = $('.edit-track-level:checked').val();
			t.trackType = $('#edit-track-activity').val();
			var country = $('#edit-track-country').val();
			t.trackRegionTags = new Array((country === 'United States') ? 'US' : country, $('#edit-track-region').val());


			// Just keep the fields that have changed
			for (i=0; i<fields.length; i++) {
				if (t[fields[i]].toString() !== ((track[fields[i]]) !== undefined ? track[fields[i]].toString() : '')) {
					trackChanged = true;
				} else {
					delete t[fields[i]]; // If not changed, remove from API request
				}
			}

			// Look at the photos part
			var photosChanged = false;
			t.trackPhotos = [];
			var photosToDelete = [];
			var grabLatLonTasks = [];
			var uploadPictureTasks = [];
			var resizeToBlobTasks = [];
			if (track.trackPhotos) {
				photosToDelete = track.trackPhotos.map(function() {return true;});
			}
			$('#edit-track-photos-container').children().each(function(index) {
				t.trackPhotos.push({
					picName: index.toString(),
					picThumb: index.toString(),
					picCaption: $(this).find('input').val()
				});
				if ($(this).hasClass('newImage')) {
					photosChanged = true;
					trackChanged = true;
					t.trackPhotos[index].picIndex = Date.now() + index;
					var img = $(this).find('img')[0];
					t.trackPhotos[index].picThumbDataUrl = resizeImage(img, THUMBNAIL_WIDTH).toDataURL('image/jpeg', THUMB_RESIZE_QUALITY);

					grabLatLonTasks.push(grabLatLon(trackLineString, timeOffset, img, t.trackPhotos[index]));
					URL.revokeObjectURL($(this).find('img')[0].src);
					var file = $('#edit-track-photo-files')[0].files[parseInt($(this).attr('file-index'))];

					if (file.size > MAX_IMAGE_SIZE) {
						resizeToBlobTasks.push(resizeToBlob(track.trackId, img, t.trackPhotos[index].picIndex, uploadPictureTasks));
					} else {
						uploadPictureTasks.push(uploadPicture(track.trackId, t.trackPhotos[index].picIndex, file));
					}
				} else {
					var oI = parseInt($(this).attr('orig-photo-index'));
					photosToDelete[oI] = false; // Photo is a keeper
					t.trackPhotos[index].picLatLng = track.trackPhotos[oI].picLatLng;
					if ((track.trackPhotos[oI].picIndex) !== undefined) {
						t.trackPhotos[index].picIndex = track.trackPhotos[oI].picIndex;
					}
					t.trackPhotos[index].picThumbDataUrl = 'data:image/jpeg;base64,' + track.trackPhotos[oI].picThumbBlob;
					if (index !== oI) {
						// If pics is reordered, make sure we replace implied picIndex with explicit one
						if (track.trackPhotos[oI].picIndex === undefined) {
							t.trackPhotos[index].picIndex = oI;
						}
					}
					if ((index !== oI) || (t.trackPhotos[index].picCaption !== track.trackPhotos[oI].picCaption)) {
						photosChanged = true;
						trackChanged = true;
					}
				}
			});

			// Schedule delete photos task
			var deletePictureTasks = [];

			if ($.inArray(true, photosToDelete) >= 0) {
				photosChanged = true;
				trackChanged = true;
				for (i=0; i<photosToDelete.length; i++) {
					if (photosToDelete[i]) {
						deletePictureTasks.push(deletePicture((track.trackPhotos[i].picIndex === undefined ? i : track.trackPhotos[i].picIndex)));
					}
				}
			}

			t.hasPhotos = (t.trackPhotos.length === 0) ? t.hasPhotos = false : t.hasPhotos = true;

			if (!photosChanged) {
				delete t.trackPhotos;
			}

			if (trackChanged) {
				$.when.apply(this, resizeToBlobTasks).then(function () {
					$.when.apply(this, uploadPictureTasks).then(function () {
						$.when.apply(this, grabLatLonTasks).then(function () {
							$.when.apply(this, deletePictureTasks).then(function () {
								updateTrack(t);
							}, function (jqxhr) {
								displaySaveError(tmMessages.DELETE_PIC_ERROR + jqxhr.status + ' - ' + jqxhr.responseText);
							});
						});
					}, function (jqxhr) {
						displaySaveError(tmMessages.UPLOAD_PIC_ERROR + jqxhr.status + ' - ' + jqxhr.responseText);
					});
				});
			} else {
				$('#editTrackModal').modal('hide');
				$('#saveSpinner').spin(false);
				cleanupErrorMarks();
			}
		}
	};

	var displaySaveError = function (message) {
		$('#editInfoTab').tab('show');
		$('#savingMessage').hide();
		$('#saveSpinner').spin(false);
		$('#saveButton').removeAttr('disabled');
		displayErrorMessage('edit', '#edit-track-name', message);
	};

	var removeTrack = function(trackId) {
		tmData.removeTrack(trackId, localStorage.getItem('rikitraki-token'), function() {
			$('#removeTrackMessage').fadeIn('slow');
			setTimeout(function () {
				window.location.href='/';
			}, 2000);
		}, function(jqxhr) { // jqxhr, textStatus
			$('#removeTrackErrorText').text(tmMessages.REMOVE_ERROR + jqxhr.status + ' - ' + jqxhr.responseText);
			$('#removeTrackError').fadeIn('slow');
			console.log(jqxhr);
		});
	};

	var enableFilterButton = function() {
		$('#filter-btn').click(function() {
			cleanupErrorMarks();
			$('#filterModal').find('form').trigger('reset');


			var filter = localStorage.getItem('rikitraki-filter');
			if (filter) {
				filter = JSON.parse(filter);
				var i = 0;
				if (filter.username) {
					$('#filter-username').val(filter.username);
				}
				if (filter.trackFav) {
					$('#filter-favorite').prop('checked', true);
				}
				if (filter.level) {
					filter.level = filter.level.split(',');
					for (i=0; i<filter.level.length; i++) {
						$('.filter-level[value="' + filter.level[i] + '"]').prop('checked', true);
					}
				}
				if (filter.activity) {
					filter.activity = filter.activity.split(',');
					$('#filter-activity').val(filter.activity);
				}
				if (filter.country) {
					$('#filter-country').attr('data-default-value', (filter.country === 'US') ? 'United States' : filter.country);

					// Needed to fix crs annoying issue
					$('#filter-country').attr('data-crs-loaded', 'false');
					crs.init();
				}
				if (filter.region) {
					$('#filter-region').val(filter.region);
				}
			} else {
				// Needed to fix crs annoying issue
				$('#filter-country').attr('data-crs-loaded', 'false');
				crs.init();
			}

			// Below needed to fix annoying crs issue


			var me = localStorage.getItem('rikitraki-username');
			if (me) {
				$('#filter-me').removeAttr('disabled');
				$('#filter-me').change(function() {
					if ($('#filter-me').is(':checked')) {
						$('#filter-username').attr('disabled', true);
						$('#filter-username').val(me);
					} else {
						$('#filter-username').removeAttr('disabled');
						$('#filter-username').val('');
					}
				});
			}

			$('#filterModal').modal('show');
			return false;
		});

		$('#applyFilterButton').click(function() {
			var filter = {};
			var username = $('#filter-username').val();
			var i = 0;
			if (username.trim()) {
				filter.username = username.trim();
			}
			var trackFav = $('#filter-favorite').is(':checked');
			if (trackFav) {
				filter.trackFav = true;
			}
			var filterLevel = $('.filter-level:checked');
			if (filterLevel.length < 3) {
				for (i=0; i<filterLevel.length; i++) {
					filter.level = (i === 0) ? (filterLevel[i].value) : (filter.level + ',' + filterLevel[i].value);
				}
			}
			var filterActivity = $('#filter-activity').val();
			if (filterActivity) {
				filter.activity = filterActivity.join();
			}
			var country = $('#filter-country').val();
			if (country) {
				filter.country = (country === 'United States') ? 'US' : country;
			}
			var region = $('#filter-region').val();
			if (region) {
				filter.region = region;
			}

			if (!$.isEmptyObject(filter)) {
				tmData.getNumberOfTracks(JSON.stringify(filter), function(data) {
					if (data.numberOfTracks < 1) {
						$('#filterErrorText').text('No tracks found for these filter settings');
						$('#filterError').fadeIn('slow');
					} else {
						localStorage.setItem('rikitraki-filter', JSON.stringify(filter));
						window.location.reload();
					}
				});
			} else {
				localStorage.removeItem('rikitraki-filter');
				window.location.reload();
			}
			return false;
		});

		$('#clearFilterButton').click(function() {
			// $('#filterModal').find('form').trigger('reset');
			localStorage.removeItem('rikitraki-filter');
			window.location.reload();
			return false;
		});
	};

	// Public tmForms API
	return {
		setUpUserForms: setUpUserForms,
		enableEditButton: enableEditButton
	};

})();
