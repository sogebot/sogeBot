#!/bin/bash
cd /app


if [ -z "$PROFILER" ]
then
  yarn start
else
  echo 'Starting bot with DEBUG flag, inspect exposed at 0.0.0.0:9229'
  yarn debug
fi