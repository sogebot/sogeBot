#!/bin/bash
cd /app


if [ -z "$PROFILER" ]
then
  npm update @sogebot/ui-admin @sogebot/ui-overlay @sogebot/ui-helpers @sogebot/ui-oauth @sogebot/ui-public && npm start
else
  echo 'Starting bot with DEBUG flag, inspect exposed at 0.0.0.0:9229'
  npm update @sogebot/ui-admin @sogebot/ui-overlay @sogebot/ui-helpers @sogebot/ui-oauth @sogebot/ui-public && npm run debug
fi