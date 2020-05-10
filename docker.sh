#!/bin/bash
cd /app

if [ -z "$DEBUG" ]
then
  npm start
else
  echo 'Starting bot with DEBUG flag, inspect exposed at 0.0.0.0:9229'
  npm run debug
fi