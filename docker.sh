#!/bin/bash
cd /app

npm update @sogebot/ui-admin @sogebot/ui-overlay @sogebot/ui-helpers @sogebot/ui-oauth @sogebot/ui-public;

if [ -z "$PROFILER" ]
then
  npm start
else
  echo 'Starting bot with DEBUG flag, inspect exposed at 0.0.0.0:9229'
  npm run debug
fi