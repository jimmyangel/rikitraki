'use strict';
// The below is to stop jshint barking at defined but never used variables
/* exported tmForms */
/* globals tmData, tmUtils */

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
			if (!tmUtils.isValidEmail($('#forgot-email').val())) {
				$('#forgot-email').next().addClass('glyphicon-remove');
				$('#forgot-email').focus();
				$('#forgotErrorText').text('Please enter a valid email');
				$('#forgotError').fadeIn('slow');
			} else {
				$('#forgotError').hide();
				$('#forgot-email').next().removeClass('glyphicon-remove');
				$('#forgotMessage').fadeIn('slow');
				setTimeout(function () {
					self.resetLoginDialog();
				}, 2000);
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
			if (!tmUtils.isValidEmail($('#inv-email').val())) {
				$('#inv-email').next().addClass('glyphicon-remove');
				$('#inv-email').focus();
				$('#invitationErrorText').text('Please enter a valid email');
				$('#invitationError').fadeIn('slow');
			} else {
				$('#invitationError').hide();
				$('#inv-email').next().removeClass('glyphicon-remove');
				$('#invitationMessage').fadeIn('slow');
				setTimeout(function () {
					self.resetLoginDialog();
				}, 2000);
			}
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
					tmData.updateUserProfile(reg, localStorage.getItem('rikitraki-token'), function() {
						$('#profileMessage').fadeIn('slow');
						setTimeout(function () {
							self.resetUserDialog();
						}, 2000);
					}, function(jqxhr) { // jqxhr, textStatus
						// Password mismatch error will come here
						// Add internal error message here
						console.log(jqxhr);
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
			$('#removeMessage').fadeIn('slow');
			setTimeout(function () {
				self.resetUserDialog();
				self.logoff();
			}, 2000);
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
				errorMsg: 'Password must be between 6 and 18 characters long',
			 	isValid: function () {
			 		if (($(this.fieldId).val() === '') && ($('#usr-password').val() === '')) {
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
				fieldId: '#usr-password',
				errorMsg: 'Password must be between 6 and 18 characters long',
			 	isValid: function () {
			 		if (($(this.fieldId).val() === '') && ($('#usr-oldpassword').val() === '')) {
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
				errorMsg: 'Please select a GPX file for this track (up to 1MB size)',
			 	isValid: function () {
			 		if ($('#track-file')[0].files[0]) {
			 			if ($('#track-file')[0].files[0].size > 1000000) {
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
			},
			{
				fieldId: '#track-region-tags',
				errorMsg: 'Please enter region tags for this track',
			 	isValid: function () {
			 		return ($(this.fieldId).val() === '') ? false : true;
			 		// return !($(this.fieldId).val() === '');
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
		$('#userModal').modal('hide');
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


		$('#uploadButton').click(function() {

			if (self.isValidForm('upload')) {
				var fReader = new FileReader();
				fReader.onload = function() {
					var parser = new DOMParser();
					var lat;
					var lon;
					console.log('here is the file');
					var doc = parser.parseFromString(fReader.result, 'application/xml');
					if (doc.documentElement.tagName !== 'gpx') {
						self.displayErrorMessage('upload', '#track-file', 'Please select a valid GPX file');
						console.log('invalid file');
						return;
					}
					try {
						lat = Number(doc.getElementsByTagName('trk')[0].getElementsByTagName('trkpt')[0].getAttribute('lat'));
						lon = Number(doc.getElementsByTagName('trk')[0].getElementsByTagName('trkpt')[0].getAttribute('lon'));
						console.log('the track lat long...', lat, lon);
					} catch (e) {
						self.displayErrorMessage('upload', '#track-file', 'Please select a valid GPX file');
						console.log('BAD GPX FILE');
						return;
					}
					console.log('ready to save data');
					var track = {};
					track.trackLatLng = [lat, lon];
					track.trackRegionTags = ($('#track-region-tags').val().split(',')).map($.trim);
					// track.trackType = $('#track-activity:checked').val(); -- Need to add this one to the schema
					track.trackLevel = $('#track-level:checked').val();
					track.trackFav = $('#track-favorite').is(':checked');
					track.trackGPX = $('#track-file')[0].files[0].name;
					track.trackName = $('#track-name').val();
					track.trackDescription = $('#track-description').val();
					track.trackGPXBlob = fReader.result;
					tmData.addTrack(track, localStorage.getItem('rikitraki-token'), function(data) {
						console.log('added track >>> ', data);
					}, function(jqxhr) { // jqxhr, textStatus
						// Add internal error message here
						console.log(jqxhr);
					});
					console.log(track);
				};
				// console.log('lets read this file...', $('#track-file')[0].files[0].type);
				console.log('the file url is... ', URL.createObjectURL($('#track-file')[0].files[0]));
				console.log('the file name is... ', $('#track-file')[0].files[0].name);
				console.log($('#track-file')[0].files[0]);
				try {
					fReader.readAsText($('#track-file')[0].files[0]);
				} catch (e) {
					console.log(e);
				}
			}
			return false;
		});
	}
};
