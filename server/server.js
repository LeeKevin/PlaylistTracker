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

    var newConnections = [];
    var ipSpamChecker = {};
    var socketSpamChecker = {};

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
            db.hgetall("tracks", function (err, res) {
                var tracks = [];
                for (var trackId in res) {
                    // skip loop if the property is from prototype
                    if (!res.hasOwnProperty(trackId)) continue;

                    try {
                        var track = JSON.parse(res[trackId]);
                    } catch (e) {
                        continue;
                    }
                    helpers.binaryInsertionSortByDate(tracks, track, 'added_at');
                }
                callback(tracks);
            });
        }
    };

    function sendTracks(token) {
        spotify.fetchPlaylistTracks(config['target']['user'], config['target']['playlist'], token, function (tracks) {
            storage.addTracks(tracks);

            //send tracks to client
            storage.getTracks(function (res) {
                io.sockets.emit('updateTracks', res);
            });
        });
    }

    function isSpam(socket) {
        var ipSpamCount = ipSpamChecker[socket.ipAddress];
        var socketSpamCount = socketSpamChecker[socket.id];
        var isSpam = false;
        // Check for spamming from a single socket (warning at > 3 / second)
        if (!socketSpamCount) {
            socketSpamChecker[socket.id] = 1;
        } else if (socketSpamCount > 3) {
            if (socket.socketWarningFlag) {
                socket.emit('news', 'There\'s too much traffic from your computer; refresh to reconnect!');
                socket.disconnect();
                isSpam = true;
            } else {
                socket.socketWarningFlag = 1;
                socket.emit('news', 'It looks like you\'re sending a lot of requests... Slow down!');
            }
        } else ++socketSpamChecker[socket.id];

        // Check for spamming from a single IP address (warning at > 400 / second)
        if (!ipSpamCount) {
            ipSpamChecker[socket.ipAddress] = 1;
        } else if (++ipSpamCount > 400) {
            if (socket.ipWarningFlag) {
                socket.emit('news', 'There\'s too much traffic from your network; refresh to reconnect!');
                socket.disconnect();
                isSpam = true;
            } else {
                socket.ipWarningFlag = 1;
                socket.emit('news', 'It looks like you\'re sending a lot of requests... Slow down!');
            }
        } else ++ipSpamChecker[socket.ipAddress];

        return isSpam;
    }

    //Init server and data store:
    db = redis.createClient();

    db.on("error", function (err) {
        console.log("Redis error: " + err);
    });

    io.sockets.on('connection', function (socket) {
        socket.ipAddress = socket.handshake.address.address;
        newConnections.push(socket);

        socket.on('requestPlaylist', function () {
            //prepare playlist data
            if (isSpam(socket)) return;
            spotify.fetchToken(function (token) {
                spotify.fetchPlaylistInfo(config['target']['user'], config['target']['playlist'], token, function (err, playlist) {
                    socket.emit('playlist', playlist);
                });
            });
        });

        socket.on('requestTracks', function () {
            if (isSpam(socket)) return;
            spotify.fetchToken(function (token) {
                sendTracks(token);
            });
        });
    });

    //Load new tracks every Monday at 3:00 AM (this executes at local time, so you may want to adjust).
    new cron('0 0 3 * * 1', function () {
        spotify.fetchToken(function (token) {
            sendTracks(token);
        });
    }, null, true);

})();