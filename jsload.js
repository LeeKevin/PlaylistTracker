/**
 * jsload.js
 *
 * jsload.js is the script to load automatically built and versioned javscript and stylesheet files.
 * File paths are extracted from rev-manifest.json and the appropriate HTML elements are inserted
 * into the DOM to load these files onto the page.
 *
 *
 * Released under the MIT and GPL Licenses.
 * ------------------------------------------------
 * @author Kevin Lee
 * @version: 0.0.1
 */
(function () {
    'use strict';

    /**
     * The root directory relative to the file paths listed in the manifest.
     * @type {string}
     */
    var BUILD_PATH = '/public/build/';
    /**
     * The path to the file manifest that contains a list of the versioned
     * javascript and stylesheet file paths.
     * @type {string}
     */
    var fileListSource = BUILD_PATH + 'rev-manifest.json';

    var helpers = {
        /**
         * Very basic asynchronous http request for a local JSON resource.
         *
         * @param {string} path      The URL to which to send the request
         * @param {function} success The callback to be executed on success. The parsed
         *                           JSON object is an argument.
         */
        loadJSON: function (path, success) {
            var _this = this;
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        if (success) success(JSON.parse(xhr.responseText));
                    } else {
                        _this.errorHandler(xhr.status);
                    }
                }
            };
            xhr.open("GET", path, true);
            xhr.send();
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
        },
        /**
         * Loads a javascript or stylesheet file onto the page by inserting its analogous HTML
         * element.
         *
         * @param {string} file The javascript or stylesheet file URL to load into the DOM
         */
        loadFile: function (file) {
            var head, extension, element;

            head = document.getElementsByTagName('head')[0];
            extension = file.split('.').pop();

            if (extension == 'js') {
                element = this.createJavascriptElement(file);
            } else if (extension == 'css') {
                element = this.createStylesheetLink(file);
            }

            if (element) head.appendChild(element);
        },
        /**
         * Generates a javascript script element
         *
         * @param js The javascript source URL
         * @returns {Element}
         */
        createJavascriptElement: function (js) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = BUILD_PATH + js;

            return script;
        },
        /**
         * Generates a stylesheet link element
         *
         * @param css The stylesheet source URL
         * @returns {Element}
         */
        createStylesheetLink: function (css) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = BUILD_PATH + css;

            return link;
        }
    };

    helpers.loadJSON(fileListSource, function (json) {
        for (var file in json) {
            if (json.hasOwnProperty(file)) {
                helpers.loadFile(json[file]);
            }
        }
    });
})();