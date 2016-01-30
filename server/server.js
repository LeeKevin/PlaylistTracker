(function () {
    'use strict';

    var config = require('./config/config');

    var
        sync = require('synchronize'),
        helpers = require('./src/helpers'),
        cron = require('cron').CronJob,
        redis = require('redis'),
        io = require('socket.io').listen(config['listenPort'])
        ;

    var spotify, storage, db;

    spotify = {
        /**
         * Fetches the token object for the Spotify app, false otherwise
         *
         * @param {function} callback - callback that contains the token
         */
        fetchToken: function (callback) {
            helpers.loadJSON("POST", "https://accounts.spotify.com/api/token", {
                    'Authorization': 'Basic ' + helpers.encodeKey(config['authentication']['client_id'], config['authentication']['client_secret']),
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache'
                },
                {grant_type: 'client_credentials'},
                function (err, token) {
                    callback(token);
                }
            );
        },
        /**
         * Retrieve all the current tracks on the provided user playlist.
         *
         * @param {string} user         The Spotify user who owns the playlist
         * @param {string} playlist     The Spotify playlist identifier
         * @param {Object} token        The authentication token object
         * @param {function} callback   Callback with an array of track objects, false otherwise
         */
        fetchPlaylistTracks: function (user, playlist, token, callback) {
            if (!(user && playlist && typeof token == 'object')) return false;

            var playlistPath = 'https://api.spotify.com/v1/users/' + user + '/playlists/' + playlist + '/tracks';
            var tracks = [];
            sync.fiber(function () {
                do {
                    //retrieve a paging object with up to the first 100 tracks on the playlist
                    var pagingObject = sync.await(helpers.loadJSON("GET", playlistPath, {
                        'Accept': 'application/json',
                        'Authorization': token['token_type'] + ' ' + token['access_token']
                    }, sync.defer()));

                    if (!pagingObject) break;

                    //pull the added_at parameter from the playlist track object and add it to the track
                    for (var i = 0; i < pagingObject['items'].length; i++) {
                        var track = pagingObject['items'][i]['track'];
                        track['added_at'] = pagingObject['items'][i]['added_at'];
                        tracks.push(track);
                    }

                    //update the playlist path with the API url for the next 100 tracks on the playlist
                    playlistPath = pagingObject['next'];

                }
                while (playlistPath); //continue until there are no more tracks/paging objects

                callback(tracks);
            });
        },
        fetchPlaylistInfo: function (user, playlist, token, callback) {
            if (!(user && playlist && typeof token == 'object')) return false;

            var fields = [
                'id', 'name', 'description', 'owner', 'external_urls', 'uri', 'images'
            ];
            var playlistPath = 'https://api.spotify.com/v1/users/' + user + '/playlists/' + playlist + '?fields=' + fields.join();
            var test = 'test';
            helpers.loadJSON("GET", playlistPath, {
                'Accept': 'application/json',
                'Authorization': token['token_type'] + ' ' + token['access_token']
            }, callback);
        }
    };

    storage = {
        /**
         * Asynchronously store new tracks.
         *
         * @param {Array} tracks        Array of track objects to save
         */
        addTracks: function (tracks) {
            if (!(typeof tracks == 'object' && helpers.isArray(tracks))) return false;

            for (var i = 0; i < tracks.length; i++) {
                var track = tracks[i];
                db.hset("tracks", track['id'], JSON.stringify(track));
            }
        },
        getTracks: function (callback) {
            db.hgetall("tracks", callback);
        }
    };

    function sendTracks(token) {
        spotify.fetchPlaylistTracks(config['target']['user'], config['target']['playlist'], token, function (tracks) {
            storage.addTracks(tracks);

            //send tracks to client
            storage.getTracks(function (err, res) {
                io.sockets.emit('updateTracks', res);
            });
        });
    }

    //Init server and data store:
    db = redis.createClient();

    db.on("error", function (err) {
        console.log("Redis error: " + err);
    });

    io.sockets.on('connection', function (socket) {
        socket.ipAddress = socket.handshake.address.address;

        //prepare playlist data
        spotify.fetchToken(function (token) {
            spotify.fetchPlaylistInfo(config['target']['user'], config['target']['playlist'], token, function (err, playlist) {
                socket.emit('playlist', playlist);
            });

            sendTracks(token);
        });
    });

    //Load new tracks every Monday at 3:00 AM (this executes at local time, so you may want to adjust).
    new cron('0 0 3 * * 1', function () {
        spotify.fetchToken(function (token) {
            sendTracks(token);
        });
    }, null, true);

})();