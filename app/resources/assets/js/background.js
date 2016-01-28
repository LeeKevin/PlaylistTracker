/**
 * The script that is run in the background for the plugin.
 *
 * @author Kevin Lee
 * @version: 0.0.1
 */

//expose the app namespace to global scope
var app;

(function () {
    'use strict';

    //auth key
    var AUTH = 'YjY3ZThlN2YyZGZkNDExZmE5MTQyMjg4MWEwM2JjMWQ6YzI5MTA5ZjdhMTI0NDFhNjkzMzQ0YTc5OGQ4ZTk2MDA=';
    //playlist info
    var user = 'spotifydiscover';
    var playlist = '6yvCTzloWw32VYEuNjeuRU';

    app = {
        /**
         * Fetches the token object for the Spotify app, false otherwise
         *
         * @returns {boolean|Object}
         */
        fetchToken: function () {
            var tokenPath = 'https://accounts.spotify.com/api/token';
            return helpers.loadJSON("POST", tokenPath, {
                    'Authorization': 'Basic ' + AUTH,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cache-Control': 'no-cache'
                },
                'grant_type=client_credentials'
            );
        },
        /**
         * Retrieve all the current tracks on the provided user playlist.
         *
         * @param {string} user     The Spotify user who owns the playlist
         * @param {string} playlist The Spotify playlist identifier
         * @param {Object} token    The authentication token object
         * @returns {Array|boolean} Return an array of track objects, false otherwise
         */
        fetchPlaylistTracks: function (user, playlist, token) {
            if (!(user && playlist && typeof token == 'object')) return false;

            var playlistPath = 'https://api.spotify.com/v1/users/' + user + '/playlists/' + playlist + '/tracks';
            var tracks = [];
            do {
                //retrieve a paging object with up to the first 100 tracks on the playlist
                var pagingObject = helpers.loadJSON("GET", playlistPath, {
                    'Accept': 'application/json',
                    'Authorization': token['token_type'] + ' ' + token['access_token']
                }, null);

                if (!pagingObject) return false;

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

            return tracks;
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
         * Asynchronously store new tracks. If tracks already exist under the provided key,
         * any new tracks (i.e. those with a unique track id) will be appended to the current
         * record.
         *
         * @param key           The key under which the track objects are to be saved.
         * @param newTracks     Array of track objects to save
         * @returns {boolean}   Return false on failure
         */
        storeTracks: function (key, newTracks) {
            if (!(typeof newTracks == 'object' && Array.isArray(newTracks))) return false;
            var _this = this;

            app.readTracks(key, function (tracks) {
                var oldTrackIds = [];
                var i;

                for (i = 0; i < tracks.length; i++) {
                    oldTrackIds.push(tracks[i][id]);
                }

                for (i = 0; i < newTracks.length; i++) {
                    var track = newTracks[i];
                    //if already exists in list, do not add
                    if (oldTrackIds.indexOf(track['id']) > -1) continue;
                    tracks.push(track);
                }

                var tracksObject = {};
                tracksObject[key] = tracks;
                chrome.storage.local.set(tracksObject, function () {
                    _this.storeRunDate();
                });
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
        }
    };

    var helpers = {
        /**
         * Synchronous http request for a JSON resource.
         *
         * @param {string} method   "GET", "POST", "PUT", "DELETE"
         * @param {string} path     The URL to which to send the request
         * @param {Object} headers  Associative array/object containing header information
         * @param {string} data     Any data to be passed with the request (in the form of a text
         *                          string in standard URL-encoded notation)
         * @returns {boolean|Object} Returns a object containing the parsed JSON, false otherwise
         */
        loadJSON: function (method, path, headers, data) {
            var _this = this,
                xhr, result;

            result = false;
            xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    try {
                        var json = JSON.parse(xhr.responseText);
                    } catch (e) {
                        console.log('Status ' + xhr.status + ': Could not parse json.');
                        json = false;
                    }

                    if (xhr.status === 200) {
                        result = json;
                    } else {
                        console.log(json);
                        _this.errorHandler(xhr.status);
                    }
                }
            };
            xhr.open(method, path, false);
            if (typeof headers == 'object') {
                for (var header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        var value = headers[header];
                        if (typeof value == 'string' && typeof header == 'string') {
                            xhr.setRequestHeader(header, value);
                        }
                    }
                }
            }

            xhr.send(typeof data == 'string' ? data : null);

            return result;
        },
        /**
         * Print error description based on error code.
         *
         * @param {number} status The status number
         */
        errorHandler: function (status) {
            switch (status) {
                case 404:
                    console.log('File not found');
                    break;
                case 500:
                    alert('Server error');
                    break;
                case 0:
                    alert('Request aborted');
                    break;
                default:
                    alert('Unknown error ' + status);
            }
        }
    };

    //Run once on startup
    background.run();
    //Run consecutively every day (and check if it has been a new week)
    setInterval(function () {
        background.run();
    }, 86400000);

})();