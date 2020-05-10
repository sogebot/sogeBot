#!/bin/bash
cd /app

if [ -n $DEBUG ]
then
  echo 'Starting bot with DEBUG flag, inspect exposed at 0.0.0.0:9229'
  npm run debug
else
  npm start
fi