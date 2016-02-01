(function () {
    'use strict';

    var https = require('https');
    var querystring = require('querystring');
    var url = require('url');

    var helpers = {
        /**
         * Synchronous http request for a JSON resource.
         *
         * @param {string} method           "GET", "POST", "PUT", "DELETE"
         * @param {string} urlString        The URL to which to send the request
         * @param {Object} headers          Associative array/object containing header information
         * @param {Object|function} data    Any data to be passed with the request
         * @param {function} [callback]     Callback function that returns the json Object or false
         *
         * @returns {boolean|Object} Returns an object containing the parsed JSON, false otherwise
         */
        loadJSON: function (method, urlString, headers, data, callback) {
            var requestData = typeof data == 'object' ? querystring.stringify(data) : '',
                _this = this,
                options,
                request,
                parsedUrl;

            if (typeof data == 'function' && typeof callback == 'undefined') callback = data;

            parsedUrl = url.parse(urlString);
            options = {
                hostname: parsedUrl['hostname'],
                path: parsedUrl['pathname'],
                method: method,
                headers: headers
            };

            request = https.request(options);
            request.on('response', function (res) {
                if (res.statusCode !== 200) {
                    _this.errorHandler(res.statusCode);
                    if (typeof callback == 'function') callback(null, false);
                    return;
                }

                res.setEncoding('utf8');
                var fullResponse = [];
                res.on('data', function (d) {
                    fullResponse.push(d);
                });

                res.on('end', function () {
                    try {
                        if (typeof callback == 'function') callback(null, JSON.parse(fullResponse.join('')));
                    } catch (e) {
                        console.error('Could not parse JSON: ' + e.message);
                        if (typeof callback == 'function') callback(e, false);
                    }
                });
            });

            request.on('error', function (e) {
                console.error(e.message);
                if (typeof callback == 'function') callback(e, false);
            });

            request.write(requestData);
            request.end();
        },
        /**
         * Print error description based on error code.
         *
         * @param {number} status The status number
         */
        errorHandler: function (status) {
            switch (status) {
                case 404:
                    console.error('File not found');
                    break;
                case 500:
                    console.error('Server error');
                    break;
                case 0:
                    console.error('Request aborted');
                    break;
                default:
                    console.error('Unknown error ' + status);
            }
        },
        /**
         * Creates a Base 64 encoded string from an id and secret key
         * @param id
         * @param secret
         * @returns {string}
         */
        encodeKey: function (id, secret) {
            return new Buffer(id + ':' + secret).toString('base64');
        },
        isArray: function (arr) {
            return Object.prototype.toString.call(arr) === '[object Array]';
        },
        /**
         * Inserts an object into a sorted array by date, ordered from newest to oldest
         *
         * @param arr The sorted array to insert
         * @param obj The object containing a date string property key-value
         * @param datePropertyName The property key name for the date string to compare
         */
        binaryInsertionSortByDate: function (arr, obj, datePropertyName) {
            var start = 0, end = arr.length > 0 ? arr.length - 1 : 0, mid;

            do {
                mid = Math.floor((end + start) / 2 || 0);
                if (mid == 0) break;
                if (new Date(obj[datePropertyName]) > new Date(arr[mid][datePropertyName])) {
                    end = mid - 1;
                    continue;
                }

                start = mid + 1;
            } while (start < end);

            arr.splice(start, 0, obj);
        }
    };

    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = helpers;
    } else if (typeof global === 'object') {
        global.helpers = helpers;
    } else if (typeof window === 'object') {
        window.helpers = helpers;
    }

})();