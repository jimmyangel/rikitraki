'use strict';
var jquery = require('jquery');
window.$ = window.jQuery = jquery;

require('bootstrap');

import {tmConfig} from './config.js';

function setUpForm () {
  var urlVars = tmConfig.getUrlVars();
  var username = urlVars.username;
  var token = urlVars.token;
  $('#hi-username').text(username);

  $('#activateModal').modal('show');

  $('#activateAccountButton').click(function() {
    $('#activationError').hide();

    $.ajax({
      url: tmConfig.getApiV2BaseUrl() + '/users/' + username + '/activation',
      type: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token
       },
      contentType: 'application/json; charset=utf-8',
      success: function () {
        localStorage.setItem('rikitraki-token', token);
        localStorage.setItem('rikitraki-username', username);
        $('#activationMessage').fadeIn('slow');
        setTimeout(function () {
          window.location.href='/';
        }, 2000);
      },
      error: function (jqxhr) {
        $('#activationErrorText').text('Activation error, status ' + jqxhr.status + ' - ' + jqxhr.responseText);
        $('#activationError').show();
      }
    });
    return false;
  });
}

window.onload = setUpForm;
