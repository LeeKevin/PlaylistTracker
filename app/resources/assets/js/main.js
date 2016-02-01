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
            window.setTimeout(function () {
                $('section.main').prepend(helpers.renderPartial('main', {
                    playlist_name: playlist['name'],
                    playlist_image_url: playlist["images"][0]['url'],
                    playlist_description: playlist['description']
                }));

                callback();
            }, 300);
        },
        populateTracks: function (tracks) {
            var tracksList = $('.tracks-list').removeClass('loading');

            $.each(tracks, function (i, track) {
                tracksList.find('tbody').append(helpers.renderPartial('track', {
                    track_name: track['name'],
                    track_url: track['uri'],
                    track_artist: track['artists'].map(function (artist) {
                        return artist['name'];
                    }).join(', '),
                    track_album: track['album']['name'],
                    track_added: helpers.timeSince(track['added_at'])
                }));
            });
        },
        bindListeners: function () {

        }
    };

    var helpers = {
        renderPartial: function (partial_name, params) {
            if (!Partials.hasOwnProperty(partial_name)) return '';
            if (typeof params != 'object') params = {};
            var partial = Partials[partial_name];
            Mustache.parse(partial);

            return Mustache.render(partial, params);
        },
        timeSince: function (date) {
            date = (date instanceof Date) ? date : (typeof date == 'string' ? new Date(date) : null);

            if (!date) return '';

            var seconds = Math.floor((new Date() - date) / 1000);

            var interval = Math.floor(seconds / 31536000);

            if (interval > 1) {
                return interval + " years ago";
            }
            interval = Math.floor(seconds / 2592000);
            if (interval > 1) {
                return interval + " months ago";
            }
            interval = Math.floor(seconds / 86400);
            if (interval > 1) {
                return interval + " days ago";
            }
            interval = Math.floor(seconds / 3600);
            if (interval > 1) {
                return interval + " hours ago";
            }
            interval = Math.floor(seconds / 60);
            if (interval > 1) {
                return interval + " minutes ago";
            }
            return Math.floor(seconds) + " seconds ago";
        }
    };

})();