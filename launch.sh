#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

if [ ! -d "$DIR/node_modules" ]; then
    npm install
fi

npm start
