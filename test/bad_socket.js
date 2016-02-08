var should = require('should');
var io = require('socket.io-client');
var config = require('../server/config/config.json');

var socketURL = 'http://localhost:' + config['listenPort'];

var options = {
    transports: ['websocket'],
    'force new connection': true
};

describe("Invalid input", function () {
    it('should log a message when user is spamming', function (done) {
        var newsCount = 0;
        var client = io.connect(socketURL, options);
        client.on('connect', function () {
            client.on('news', function (message) {
                newsCount++;
                if (newsCount === 1) {
                    message.should.equal('It looks like you\'re sending a lot of requests... Slow down!');
                } else {
                    message.should.equal('There\'s too much traffic from your computer; refresh to reconnect!');
                    client.disconnect();
                    done();
                }
            });
        });
        for (var i = 0; i < 8; i++) {
            client.emit('requestTracks'); //SPAM!
        }
    });
});