#!/bin/bash
cd /app

if [ -z "$PROFILER" ]
then
  npm start
else
  echo 'Starting bot with DEBUG flag, inspect exposed at 0.0.0.0:9229'
  npm debug
fi