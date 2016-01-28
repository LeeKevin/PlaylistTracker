$(function () {
    'use strict';

    var backgroundPage = chrome.extension.getBackgroundPage();
    var app = backgroundPage.app;

    var mainPage = {
        init: function () {
            this.bindListeners();
        },
        bindListeners: function () {

        }
    };

    $(document).ready(function () {
        mainPage.init();
        app.readTracks(app.getTracksItemKey(), function (tracks) {
            console.log(tracks);
        });
    });

});