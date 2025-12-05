'use strict';
var jquery = require('jquery');
window.$ = window.jQuery = jquery;

require('bootstrap');

import {tmConfig} from './config.js';

function setUpForm () {
  var urlVars = tmConfig.getUrlVars();
  console.log(urlVars);
  var username = urlVars.username;
  var token = urlVars.token;
  $('#hi-username').text(username);

  $('#resetPModal').modal('show');
  $('#usr-password').focus();
  $('#update .form-control').on('input', function () {
    if ($(this).val() !== '') {
      $('#updateProfileButton').removeAttr('disabled');
    }
  });

  $('#updateProfileButton').click(function() {
    $('#profileError').hide();
    var password = $('#usr-password').val();
    var repassword = $('#usr-repassword').val();
    if ((password.length < 6) || (repassword.lengh > 18) || (password !== repassword)){
      $('#profileErrorText').text('Password must be 6 to 18 characters long, both fields must match');
      $('#profileError').show();
    } else {
      $.ajax({
        url: tmConfig.getApiV2BaseUrl() + '/users/' + username,
        type: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + token
         },
        data: JSON.stringify({password: password}),
        contentType: 'application/json; charset=utf-8',
        success: function () {
          $('#profileMessage').fadeIn('slow');
          setTimeout(function () {
            window.location.href='/';
          }, 2000);
        },
        error: function (jqxhr) {
          if (jqxhr.status === 400) {
            $('#profileErrorText').text('Password cannot contain special characters');
          } else {
            $('#profileErrorText').text('Password reset error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
          }
          $('#profileError').show();
        }
      });
    }
    return false;
  });
}

window.onload = setUpForm;
