#PlaylistTracker ([demo](http://leekevin.github.io/PlaylistTracker/))

I mainly made this so I could automatically save the tracks from Spotify's Weekly Discover playlist. I always forget which songs were added to the playlist in previous weeks.

##Installation

The app is separated into two parts: a super-simple server folder for serving and storing playlist tracks, and a static app folder that can be served from gh-pages or a CDN.

###Copy the project files

First, fork the repo and clone it to your local machine by typing git clone `https://github.com/<YOUR-GITHUB-HANDLE>/PlaylistTracker.git`. This will clone the project files for your use.

Alternatively, you can just download the project files and copy it somewhere on your machine.

###Server

Make sure your server machine is running [redis](http://redis.io/topics/quickstart) and has [node.js](http://nodejs.org/download/) installed before continuing.

Copy the contents of `server` to wherever you'll be serving this from.

Create a configuration file at `config/config.json` relative to the `server.js` file. The contents of this file should contain:

1. The Spotify API client id and secret key, 
2. The Spotify username and playlist id to track (I'm using the Spotify Weekly Discover playlist, which is user `spotifydiscover` and playlist `6yvCTzloWw32VYEuNjeuRU`), and 
3. The listening port for socket.io:

```
{
  "authentication": {
    "client_id": "<YOUR_CLIENT_ID>",
    "client_secret": "<YOUR_CLIENT_SECRET>"
  },
  "target": {
    "user": "<SPOTIFY_USER>",
    "playlist": "<SPOTIFY_PLAYLIST_ID>"
  },
  "listenPort": 55555
}
```

Then, run
```
npm install
```

To start the app, run
```
redis-server
node main.js
```

###App

In the `app` folder, create a `config/config.json` file that contains the server url (don't include the protocol) and port (should be the same as `listenPort` above).

Example:
```
{
  "server": {
    "url": "localhost",
    "port": 55555
  }
}
```

Then, run

```
npm install
gulp --production
```

And copy the contents of `public` to wherever you'll be serving the pages from.



