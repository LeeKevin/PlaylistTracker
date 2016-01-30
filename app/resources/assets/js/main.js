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
    //TODO uncomment
    //var socket = io.connect('http://' + config['server']['url'] + ':' + config['server']['port']);
    //
    //socket.on('connect', function () {
    //    socket.on('playlist', function (playlist) {
    //        mainPage.init(playlist);
    //    });
    //    socket.on('updateTracks', function (tracks) {
    //        console.log('Got them! ' + Object.keys(tracks).length + ' tracks.');
    //    });
    //});

    mainPage = {
        init: function (playlist) {
            this.preparePage(playlist);
            this.bindListeners();
        },
        preparePage: function (playlist) {
            var body = $('body').removeClass('loading');

            body.prepend(helpers.renderPartial('main'));
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
    mainPage.init({
        "description": "Your weekly mixtape of fresh music. Enjoy new discoveries and deep cuts chosen just for you. Updated every Monday, so save your favourites!",
        "external_urls": {
            "spotify": "http://open.spotify.com/user/spotifydiscover/playlist/6yvCTzloWw32VYEuNjeuRU"
        },
        "id": "6yvCTzloWw32VYEuNjeuRU",
        "images": [{
            "height": null,
            "url": "https://u.scdn.co/images/pl/default/985687624ed4de4d19cc495cebfd625280d19b10",
            "width": null
        }],
        "name": "Discover Weekly",
        "owner": {
            "external_urls": {
                "spotify": "http://open.spotify.com/user/spotifydiscover"
            },
            "href": "https://api.spotify.com/v1/users/spotifydiscover",
            "id": "spotifydiscover",
            "type": "user",
            "uri": "spotify:user:spotifydiscover"
        },
        "uri": "spotify:user:spotifydiscover:playlist:6yvCTzloWw32VYEuNjeuRU"
    });

})();