// run on server with:
// "forever start -a --spinSleepTime 10000 -l ~/own-this-website-personal/logs/forever_log.txt -o ~/own-this-website-personal/logs/nodemon_log.txt -e ~/own-this-website-personal/logs/error_log.txt /usr/local/bin/nodemon ~/own-this-website-personal/main.js --exitcrash"
var io = require('socket.io').listen(55555);
var redis = require('redis');
var redis_client = redis.createClient();

var newConnections = [];

// https://github.com/mranney/node_redis
redis_client.on("error", function (err) {
    console.log("Redis error: " + err);
});

io.sockets.on('connection', function(socket) {
    socket.superStrikes = 0;
    socket.ipAddress = socket.handshake.address.address;
    newConnections.push(socket);
});