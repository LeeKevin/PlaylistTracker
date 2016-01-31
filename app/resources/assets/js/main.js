(function () {
    'use strict';

    var
        config = require('config.json'),
        $ = require('jquery'),
        io = require('socket.io-client'),
        Mustache = require('mustache'),
        Partials = require('../partials/partials.json')
        ;

    var mainPage;
    var socket = io.connect('http://' + config['server']['url'] + ':' + config['server']['port']);

    socket.on('connect', function () {
        socket.on('playlist', function (playlist) {
            mainPage.init(playlist, function () {
                //request tracks once page is initialized.
                socket.emit('requestTracks');
            });
        });
        socket.on('updateTracks', function (tracks) {
            mainPage.populateTracks(tracks);
        });
    });

    mainPage = {
        init: function (playlist, callback) {
            var _this = this;
            _this.preparePage(playlist, function () {
                _this.bindListeners();

                //once page is initialized, send for callback.
                callback();
            });
        },
        preparePage: function (playlist, callback) {
            $('body').removeClass('loading');

            //wait for animation to finish
            window.setTimeout(function() {
                $('section.main').prepend(helpers.renderPartial('main', {
                    playlist_name: playlist['name'],
                    playlist_image_url: playlist["images"][0]['url']
                }));

                callback();
            }, 300);
        },
        populateTracks: function (tracks) {
            var tracksList = $('.tracks-list');

            $.each(tracks, function (i, trackJSON) {
                var track = JSON.parse(trackJSON);
                tracksList.append(helpers.renderPartial('track', {
                    track_name: track['name']
                }));
            });
        },
        bindListeners: function () {

        }
    };

    var helpers = {
        renderPartial: function(partial_name, params) {
            if (!Partials.hasOwnProperty(partial_name)) return '';
            if (typeof params != 'object') params = {};
            var partial = Partials[partial_name];
            Mustache.parse(partial);

            return Mustache.render(partial, params);
        }
    };

    //TODO remove (currently using for quick testing)
    //mainPage.init({
    //    "description": "Your weekly mixtape of fresh music. Enjoy new discoveries and deep cuts chosen just for you. Updated every Monday, so save your favourites!",
    //    "external_urls": {
    //        "spotify": "http://open.spotify.com/user/spotifydiscover/playlist/6yvCTzloWw32VYEuNjeuRU"
    //    },
    //    "id": "6yvCTzloWw32VYEuNjeuRU",
    //    "images": [{
    //        "height": null,
    //        "url": "https://u.scdn.co/images/pl/default/985687624ed4de4d19cc495cebfd625280d19b10",
    //        "width": null
    //    }],
    //    "name": "Discover Weekly",
    //    "owner": {
    //        "external_urls": {
    //            "spotify": "http://open.spotify.com/user/spotifydiscover"
    //        },
    //        "href": "https://api.spotify.com/v1/users/spotifydiscover",
    //        "id": "spotifydiscover",
    //        "type": "user",
    //        "uri": "spotify:user:spotifydiscover"
    //    },
    //    "uri": "spotify:user:spotifydiscover:playlist:6yvCTzloWw32VYEuNjeuRU"
    //});

})();