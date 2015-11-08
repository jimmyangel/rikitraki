'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmForms */
/* globals tmData, tmUtils, EXIF */
/* jshint camelcase: false */

var MAX_IMAGE_SIZE = 1000000;
var IMAGE_RESIZE_WIDTH = 1200;
var IMAGE_RESIZE_QUALITY = 0.8;
var THUMBNAIL_WIDTH = 300;

var tmForms = {
	//---- Handle login, user registration and user profile forms
	setUpUserForms: function () {
		var self = this;

		// Handle the user button (if token present, then user profile, otherwise login)
		if (localStorage.getItem('rikitraki-token')) {
			$('#hi-username').text(localStorage.getItem('rikitraki-username'));
			$('#user-btn').click(function() {
				$('#userModal').modal('show');
				return false;
			});
			// If user is logged in, then upload button needs to be be enabled
			this.enableUploadButton();
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
					self.resetLoginDialog();
					$('#user-btn').off();
					$('#hi-username').text(localStorage.getItem('rikitraki-username'));
					$('#user-btn').click(function() {
						$('#userModal').modal('show');
						return false;
					});
					self.enableUploadButton();
				}, function() { // jqxhr, textStatus
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
				$('#forgotErrorText').text('Please enter a valid email');
				$('#forgotError').fadeIn('slow');
			} else {
				tmData.requestPasswordResetToken(email, function(data) {
					console.log(data);
					$('#forgotError').hide();
					$('#forgot-email').next().removeClass('glyphicon-remove');
					$('#forgotMessage').fadeIn('slow');
					setTimeout(function () {
						self.resetLoginDialog();
					}, 2000);
				}, function() { // jqxhr, textStatus
					$('#forgotErrorText').text('No record found for this email address');
					$('#forgotError').fadeIn('slow');
				});
			}
			return false;
		});

		// Register button handler
		$('#registerButton').click(function() {

			// if (self.isValidRegistration()) {
			if (self.isValidForm('registration')) {
				var reg = {username: $('#reg-username').val(), email: $('#reg-email').val(), password: $('#reg-password').val(), invitationCode: $('#reg-invitation').val()};
				tmData.registerUser(reg, function(data) {
					localStorage.setItem('rikitraki-token', data);
					localStorage.setItem('rikitraki-username', reg.username);
					self.resetLoginDialog();
					$('#user-btn').off();
					$('#hi-username').text(reg.username);
					$('#user-btn').click(function() {
						$('#userModal').modal('show');
						return false;
					});
				}, function(jqxhr) { // jqxhr, textStatus
					$('#reg-invitation').next().addClass('glyphicon-remove');
					$('#reg-invitation').focus();
					$('#registrationErrorText').text('A valid invitation code is required to register');
					$('#registrationError').fadeIn('slow');
					console.log(jqxhr);
				});
				return false;
			}
			return false;
		});

		// Request invitation button handler
		$('#invitationButton').click(function() {
			var reg = {};
			reg.email = $('#inv-email').val();

			// Use mailgun email validation to improve chances of delivery
			tmData.validateEmail(reg.email, function (data) {
				if (data.is_valid) {		
					tmData.addInvitation(reg, function() {
						$('#invitationError').hide();
						$('#inv-email').next().removeClass('glyphicon-remove');
						$('#invitationMessage').fadeIn('slow');
						setTimeout(function () {
							self.resetLoginDialog();
						}, 2000);					
					}, function(jqxhr) {
						if (jqxhr.status === 422) {
							$('#inv-email').next().addClass('glyphicon-remove');
							$('#inv-email').focus();
							$('#invitationErrorText').text('Invitation already requested for this email address');
							$('#invitationError').fadeIn('slow');
						} else {
							if (jqxhr.status === 429) {
								$('#invitationErrorText').text('No invitations available');
							} else {
								$('#invitationErrorText').text('Save error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
							}
							$('#invitationError').fadeIn('slow');
							setTimeout(function () {
								self.resetLoginDialog();
							}, 2000);
						}
					});
				} else {
					$('#inv-email').next().addClass('glyphicon-remove');
					$('#inv-email').focus();
					$('#invitationErrorText').text('Please enter a valid email');
					$('#invitationError').fadeIn('slow');				
				}
			}, function(jqxhr) {
				console.log(jqxhr);
			});
			return false;
		});

		// Logoff link handler
		$('#logoffLink').click(function () {
			self.logoff();
		});

		// Update profile button handler
		$('#update .form-control').on('input', function () {
			if ($(this).val() !== '') {
				$('#updateProfileButton').removeAttr('disabled');
			} 
		});

		// Clear profile form upon closing
		$('#userModal').on('hidden.bs.modal', function () {
			self.resetUserDialog();
		});

		$('#updateProfileButton').click(function() {
			if (!self.isEmptyForm('profile')) {
				if (self.isValidForm('profile')) {
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
							$('#profileError').show();
						} else { 
							// Add internal error message here
							console.log(jqxhr);
						}
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
					self.logoff();
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
	},
	formValidation: {
		registration: [
			{
				fieldId: '#reg-username',
				errorMsg: 'Username must be 6 to 40 characters and have no special characters',
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
				errorMsg: 'Please enter a valid email',
			 	isValid: function () {
			 		return tmUtils.isValidEmail($(this.fieldId).val());
				}
			},
			{
				fieldId: '#reg-password',
				errorMsg: 'Password must be between 6 and 18 characters long',
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
				errorMsg: 'Re-entered password must match password',
			 	isValid: function () {
					if (($(this.fieldId).val().length < 6) || ($(this.fieldId).val() !== $('#reg-password').val())) {
						return false;
					} else {
						return true;
					}
				}
			},
			{
				fieldId: '#reg-invitation',
				errorMsg: 'Invitation code must be between 4 and 20 characters long',
			 	isValid: function () {
					if (($(this.fieldId).val().length < 4) || ($(this.fieldId).val().length > 20)) {
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
				errorMsg: 'Please enter a valid email',
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
				errorMsg: 'Please enter a valid password',
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
				errorMsg: 'Password must be between 6 and 18 characters long',
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
				errorMsg: 'Re-entered password must match password',
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
				errorMsg: 'Please select a GPX file for this track (up to 4MB size)',
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
				errorMsg: 'Please enter a name for this track',
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
			 		// return (!($(this.fieldId).val() === ''));
				}
			},
			{
				fieldId: '#track-description',
				errorMsg: 'Please enter a description for this track',
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
			 		// return !($(this.fieldId).val() === '');
				}
			}
		],
		edit: [
			{
				fieldId: '#edit-track-name',
				errorMsg: 'Please enter a name for this track',
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
				}
			},
			{
				fieldId: '#edit-track-description',
				errorMsg: 'Please enter a description for this track',
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
				}
			}
		]
	},
	isValidForm: function (formName) {
		this.cleanupErrorMarks();
		for (var i = 0; i<this.formValidation[formName].length; i++) {
			if (!this.formValidation[formName][i].isValid()) {
				this.displayErrorMessage(formName, this.formValidation[formName][i].fieldId, this.formValidation[formName][i].errorMsg);
				return false;
			}
		}
		return true;
	},
	isEmptyForm: function (formName) {
		for (var i = 0; i<this.formValidation[formName].length; i++) {
			if ($(this.formValidation[formName][i].fieldId).val() !== '') {
				return false;
			}
		}
		return true;
	},
	displayErrorMessage: function (formName, fieldId, errorMessage) {
		$(fieldId).next().addClass('glyphicon-remove');
		$(fieldId).focus();
		$('#' + formName + 'ErrorText').text(errorMessage);
		$('#' + formName + 'Error').fadeIn('slow');
	},
	resetLoginDialog: function () {
		$('#loginModal').modal('hide');
		$('#loginModal').find('form').trigger('reset');
		this.cleanupErrorMarks();
		$('#invitationMessage').hide();
		$('#forgotMessage').hide();
		$('#loginTab').tab('show');
		$('#noInvitationPanel').collapse('hide');
		$('#forgotPanel').collapse('hide');

	},
	resetUserDialog: function () {
		// $('#userModal').modal('hide');
		$('#userModal').find('form').trigger('reset');
		this.cleanupErrorMarks();
		$('#profileMessage').hide();
		$('#removeMessage').hide();		
		$('#updateProfileTab').tab('show');
		$('#updateProfileButton').attr('disabled', 'disabled');
	},
	cleanupErrorMarks: function () {
		$('.alert').hide();
		$('.form-control').next().removeClass('glyphicon-remove');
	},
	logoff: function () {
		// Remove token...
		localStorage.removeItem('rikitraki-token');
		localStorage.removeItem('rikitraki-username');
		// ...and reload the page
		window.location.href='';
	},
	enableUploadButton: function () {
		var self = this;
		$('#uploadTrackButton').append('<li><a role="button" id="upload-btn" title="Upload track" href="."><span class="glyphicon glyphicon-cloud-upload" aria-hidden="true"></span></a></li>');
		$('#upload-btn').click(function() {
			$('#uploadTrackModal').modal('show');
			return false;
		});

		$('#phototsTab').click(function() {
			if (self.isValidForm('upload')) {
				return true;
			} else {
				return false;
			}
		});

		$('#uploadButton').click(function() {
			self.uploadTrack();
			return false;
		});

		$('#track-photo-files').change(function () {
			$('#track-photos-container').empty();
			var files = $('#track-photo-files')[0].files;
			for (var i=0; i<Math.min(files.length, 8); i++) {
				$('#track-photos-container').append
					(
						'<div style="float: left;"><div><input type="text" maxLength="200" value="' + 
						files[i].name.replace(/\.[^/.]+$/, '') +
						'"' + ' class="trackUploadThumbCaption form-control"></div><div><img class="img-responsive trackUploadThumbs" src="' + 
						URL.createObjectURL(files[i]) + 
						'"></div></div>'
					);
			}
		});

	},
	uploadTrack: function () {
		var self = this;

		if (self.isValidForm('upload')) {
			var fReader = new FileReader();
			fReader.onload = function() {
				var parser = new DOMParser();
				var lat;
				var lon;
				var doc = parser.parseFromString(fReader.result, 'application/xml');
				if (doc.documentElement.tagName !== 'gpx') {
					self.displayErrorMessage('upload', '#track-file', 'Please select a valid GPX file');
					return;
				}
				try {
					// TODO: parse the gpx with omnivore to make sure it can be fully supported by the viewer
					// Get lat, long for first track point
					lat = Number(doc.getElementsByTagName('trkpt')[0].getAttribute('lat'));
					lon = Number(doc.getElementsByTagName('trkpt')[0].getAttribute('lon'));

					// Make sure we have elevation data available
					if (!(doc.getElementsByTagName('trkpt')[0].getElementsByTagName('ele')[0])) {
						self.displayErrorMessage('upload', '#track-file', 'Please select a  GPX file with valid elevation info');
						return;
					} 
				} catch (e) {
					self.displayErrorMessage('upload', '#track-file', 'Please select a GPX file with valid track info');
					return;
				}
				var track = {};
				track.trackLatLng = [lat, lon];
				var country = $('#track-country').val();
				track.trackRegionTags = new Array((country === 'United States') ? 'US' : country, $('#track-region').val());
				track.trackLevel = $('#track-level:checked').val();
				track.trackType = $('#track-activity:checked').val();
				track.trackFav = $('#track-favorite').is(':checked');
				track.trackGPX = $('#track-file')[0].files[0].name;
				track.trackName = $('#track-name').val();
				track.trackDescription = $('#track-description').val();
				track.trackGPXBlob = fReader.result;
				track.hasPhotos = false;
				self.makeTrackPhotos (function(trackPhotos) {
					if (trackPhotos.length > 0) {
						track.trackPhotos = trackPhotos;
						track.hasPhotos = true;
					}
					tmData.addTrack(track, localStorage.getItem('rikitraki-token'), function(data) {
						var files = $('#track-photo-files')[0].files;
						var images = $('#track-photos-container img');
						// This function is a task to upload a single image
						function uploadPicture(i, blob) {
							return tmData.uploadTrackPic(blob, data.trackId, i, localStorage.getItem('rikitraki-token'));
						}
						// This function makes a canvas.toBlob handler for converting a resized image to jpeg for uploading
						function makeToBlobHandler (i) {
							// After image is resized we can push the upload task
							return function (blob) {uploadPictureTasks.push(uploadPicture(i, blob));};
						}
						// Set up upload image tasks
						var uploadPictureTasks = [];
						for (var i=0; i<Math.min(files.length, 8); i++) {
							// But first resize the image if it is big
							if (files[i].size > MAX_IMAGE_SIZE) {
								self.resizeImage(images[i], IMAGE_RESIZE_WIDTH).toBlob(makeToBlobHandler(i),'image/jpeg', IMAGE_RESIZE_QUALITY);
							} else {
								uploadPictureTasks.push(uploadPicture(i, files[i]));
							}
						}
						// Execute tasks and wait for all to complete
						$.when.apply(this, uploadPictureTasks).then(function () {
							$('#uploadMessage').fadeIn('slow');
							setTimeout(function () {
								window.location.href='?track=' + data.trackId;
							}, 2000);
						}, function (jqxhr) {
							console.log(jqxhr);
						});
					}, function(jqxhr) { // jqxhr, textStatus
						// Add internal error message here
						console.log(jqxhr);
					});
					console.log(track);
				});

			};
			try {
				fReader.readAsText($('#track-file')[0].files[0]);
			} catch (e) {
				console.log(e);
			}
		}		
	},
	makeTrackPhotos: function(callback) {
		var trackPhotos = [];
		var images = $('#track-photos-container img');

		// Set up tasks to grab lat, lon from exif
		function grabLatLon (i) {
			var d = $.Deferred();
			EXIF.getData(images[i], function () {
				var lat = EXIF.getTag(this, 'GPSLatitude');
				var lon = EXIF.getTag(this, 'GPSLongitude');
				if (lat) {
					var latRef = EXIF.getTag(this, 'GPSLatitudeRef') || 'N';
					lat = (lat[0] + lat[1]/60 + lat[2]/3600) * (latRef === 'N' ? 1 : -1); 
					if (lon) {
						var lonRef = EXIF.getTag(this, 'GPSLongitudeRef') || 'W';
						lon = (lon[0] + lon[1]/60 + lon[2]/3600) * (lonRef === 'W' ? -1 : 1);
						trackPhotos[i].picLatLng = [lat, lon];
					}
				}
				d.resolve();
			});
			return d.promise();
		}
		var grabLatLonTasks = [];

		// Loop through images to set up trackPhotos object
		for (var i=0; i<images.length; i++) {
			trackPhotos.push({
				picName: i.toString(),
				picThumb: i.toString(), 
				picCaption: $('#track-photos-container input')[i].value,
				picThumbDataUrl: this.resizeImage(images[i], THUMBNAIL_WIDTH).toDataURL('image/jpeg', IMAGE_RESIZE_QUALITY)
			});

			// Extract geotags
			grabLatLonTasks.push(grabLatLon(i));			
			// Keep things clean by releasing the object URLs
			URL.revokeObjectURL(images[i].src);
		}

		// Call back when all the lat lon tasks finish
		$.when.apply(this, grabLatLonTasks).then(function () {
			callback(trackPhotos);
		});
	},
	resizeImage: function (img, width) {
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
	},
	enableEditButton: function(track) {
		var self = this;

		if ((localStorage.getItem('rikitraki-token')) && (track.username === localStorage.getItem('rikitraki-username')))  {
			$('#uploadTrackButton').append('<li><a role="button" id="edit-btn" title="Edit track info" href="."><span class="glyphicon glyphicon glyphicon-edit" aria-hidden="true"></span></a></li>');
		} else {
			return;
		}

		$('#edit-btn').click(function() {
			// Set current values on the form for editing
			$('#edit-track-name').val(track.trackName);
			$('#edit-track-description').val(track.trackDescription);
			$('#edit-track-activity[value="' + track.trackType + '"]').prop('checked', true);
			$('#edit-track-level[value=' + track.trackLevel + ']').prop('checked', true);
			if (track.trackFav) {
				$('#edit-track-favorite').prop('checked', true);
			}
			// $('#edit-track-region-tags').val(track.trackRegionTags);
			if (track.trackRegionTags[0]) {			
				var country = track.trackRegionTags[0];
				console.log(country);
				$('#edit-track-country').attr('data-default-value', (country === 'US') ? 'United States' : country);
				$('#edit-track-country').attr('data-crs-loaded', 'false');
				window.crs.init();
				if (track.trackRegionTags[1]) {
					// $('#edit-track-region').attr('data-default-value', track.trackRegionTags[1]);
					$('#edit-track-region').val(track.trackRegionTags[1]);
				} 
			}
			$('#editTrackModal').modal('show');
			return false;
		});

		$('#saveButton').click(function() {
			self.saveEditedTrackInfo(track);
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

		// Handle the remove track button
		$('#removeTrackButton').click(function() {
			self.removeTrack(track.trackId);
			return false;
		});
	},
	saveEditedTrackInfo: function(track) {
		var self = this;
		if (self.isValidForm('edit')) {
			var trackChanged = false;
			var fields = ['trackName', 'trackDescription', 'trackFav', 'trackLevel', 'trackType', 'trackRegionTags'];
			var t = {};
			t.trackId = track.trackId;
			t.trackName = $('#edit-track-name').val();
			t.trackDescription = $('#edit-track-description').val();
			t.trackFav = $('#edit-track-favorite').is(':checked');
			t.trackLevel = $('#edit-track-level:checked').val();
			t.trackType = $('#edit-track-activity:checked').val();
			var country = $('#edit-track-country').val();
			t.trackRegionTags = new Array((country === 'United States') ? 'US' : country, $('#edit-track-region').val());


			// Just keep the fields that have changed
			for (var i=0; i<fields.length; i++) {
				if (t[fields[i]].toString() !== ((track[fields[i]]) ? track[fields[i]].toString() : '')) {
					trackChanged = true;
				} else {
					delete t[fields[i]]; // If not changed, remove from API request
				}
			}
			if (trackChanged) {
				tmData.updateTrack(t, localStorage.getItem('rikitraki-token'), function(data) {
					$('#editMessage').fadeIn('slow');
					setTimeout(function () {
						window.location.href='?track=' + data.trackId;
					}, 2000);
				}, function(jqxhr) { // jqxhr, textStatus
					$('#editErrorText').text('Save error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
					$('#editError').fadeIn('slow');					
					console.log(jqxhr);
				});
			}
		}
	},
	removeTrack: function(trackId) {
		tmData.removeTrack(trackId, localStorage.getItem('rikitraki-token'), function() {
			$('#removeTrackMessage').fadeIn('slow');
			setTimeout(function () {
				window.location.href='/';
			}, 2000);
		}, function(jqxhr) { // jqxhr, textStatus
			$('#removeTrackErrorText').text('Remove error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
			$('#removeTrackError').fadeIn('slow');					
			console.log(jqxhr);
		});

	}
};
