(function () {
    'use strict';

    var config = require('config.json');
    var
        $ = require('jquery'),
        io = require('socket.io-client')
        ;

    var socket = io.connect('http://' + config['server']['url'] + ':' + config['server']['port']);
    var mainPage;

    mainPage = {
        init: function () {
            this.bindListeners();
        },
        bindListeners: function () {

        }
    };

    $(document).ready(function () {
        mainPage.init();
        socket.on('connect', function () {

            socket.on('updateTracks', function (tracks) {
                console.log('Got them! ' + Object.keys(tracks).length + ' tracks.');
            });
        });
    });
})();