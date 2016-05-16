#!/bin/bash  

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

if [ ! -d "$DIR/db" ]; then
    mkdir $DIR/db
fi

if [ ! -d "$DIR/node_modules" ]; then
    npm install
fi

node main.js
