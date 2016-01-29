(function () {
    'use strict';

    var config = require('./config/config');
    var sync = require('synchronize');
    require('./src/helpers');

    var helpers = global.helpers;

    var spotify = {
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
    };

    var storage = {
        /**
         * Asynchronously store new tracks.
         *
         * @param {array} newTracks     Array of track objects to save
         * @returns {boolean}   Return false on failure
         */
        storeTracks: function (newTracks) {
            if (!(typeof newTracks == 'object' && helpers.isArray(newTracks))) return false;

            for (var i = 0; i < newTracks.length; i++) {
                db.set(newTracks[i]['id'], JSON.stringify(newTracks[i]));
            }
        }
    }

    var background = {
        /**
         * Run!
         */
        run: function () {
            var _this = this;

            _this.executeOncePerWeek(function () {
                var token = app.fetchToken();
                var tracks = app.fetchPlaylistTracks(user, playlist, token);

                console.log(tracks.length + ' tracks found within the playlist.');
                _this.storeTracks(app.getTracksItemKey(), tracks);
            });
        },

        /**
         * Store the current date as the app's last run date
         */
        storeRunDate: function () {
            var today = new Date();
            var todayTimestamp = (today.getTime() / 1000).toFixed(0); //unix timestamp

            chrome.storage.local.set({'run_date': todayTimestamp}, function () {
                console.log(today.toLocaleDateString() + ': Tracks added.');
            });
        },
        /**
         * Retrieve the bounds of the date range from the provided array of Dates.
         *
         * @returns {boolean|Object}    Return an object containing the date range
         *                              (oldest under 'min' and latest under 'max')
         */
        getWeekMinAndMax: function () {
            if (arguments.length < 2) return false;

            var result = {};
            for (var i = 0; i < arguments.length; i++) {
                var date;
                date = arguments[i];
                if (!(date instanceof Date)) {
                    console.error('Provided argument is not date: ' + date);
                    return false;
                }
                if (!result['max'] || date > result['max']) {
                    result['max'] = date;
                }
                if (!result['min'] || date < result['min']) {
                    result['min'] = date
                }
            }

            return result;
        },
        /**
         * Determine whether an array of Dates are within a week span beginning Monday
         *
         * @returns {boolean}
         */
        isSameWeek: function () {
            if (arguments.length < 2) return false;

            var dateRange = this.getWeekMinAndMax.apply(this, arguments);
            if (!dateRange) {
                console.error('Could not determine date range.');
                return false;
            }

            var max = dateRange['max'];
            var min = dateRange['min'];
            var daysFromMonday = min.getDay() - 1 > 0 ? min.getDay() - 1 : 6;
            var closestMonday = new Date(min.getFullYear(), min.getMonth(), min.getDate() - daysFromMonday);

            return max - closestMonday <= 604800000; //is within same week starting monday
        },
        /**
         * Execute a callback function if it has not been run already this week beginning Monday
         *
         * @param {function} callback
         * @returns {boolean} Returns false on failure
         */
        executeOncePerWeek: function (callback) {
            if (typeof callback != 'function') {
                console.error('Provided argument is not function: ' + callback);
                return false;
            }

            var _this = this;
            var key = 'run_date';
            chrome.storage.local.get(key, function (items) {
                var lastRunTimestamp = items[key];

                if (lastRunTimestamp) {
                    var lastRunDate = new Date(1000 * lastRunTimestamp);
                    if (_this.isSameWeek(lastRunDate, new Date())) {
                        return false;
                    }
                }

                callback();
            });
        },
        /**
         * Asynchronously read the tracks under the provided key from storage
         * @param {string} key
         * @param {function} success
         */
        readTracks: function (key, success) {
            chrome.storage.local.get(key, function (items) {
                if (typeof success == 'function') {
                    success(items[key] ? items[key] : []);
                }
            });
        },
        getTracksItemKey: function () {
            return user + '_' + playlist + '_tracks';
        }
    };

    //Start polling for playlist tracks
    //Run once on startup
    //background.run();
    ////Run consecutively every day (and check if it has been a new week)
    //setInterval(function () {
    //    background.run();
    //}, 86400000);

    //Init server and data store:
    var io = require('socket.io').listen(55555);
    var redis = require('redis');
    var db = redis.createClient();

    db.on("error", function (err) {
        console.log("Redis error: " + err);
    });

    io.sockets.on('connection', function (socket) {
        socket.ipAddress = socket.handshake.address.address;
    });

    spotify.fetchToken(function (token) {
        spotify.fetchPlaylistTracks(config['target']['user'], config['target']['playlist'], token, function (tracks) {
            console.log(tracks.length + ' tracks found within the playlist.');

            storage.storeTracks(tracks);
        });
    });

})();