#!/bin/bash

if [ "PlaylistTracker" != ${PWD##*/} ]; then
    echo "Build failed. Please execute from the project root."
    exit
fi

echo "Building..."

if [ -d "plugin/" ]; then
  rm -rf plugin/
fi

if [ -d "public/" ]; then
  rm -rf public/
fi

if [[ $1 != "--dev" ]]; then
    npm install
fi
gulp

mkdir plugin
cp -r public/ plugin/public/
cp jsload.js plugin/
cp index.html plugin/
cp manifest.json plugin/
cp background.js plugin/

echo "Build complete. Plugin at 'plugin/'."