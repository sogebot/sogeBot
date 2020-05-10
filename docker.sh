#!/bin/bash
cd /app
if [ -n $CPUPROFILER ]
then
  echo 'Starting with CPU profiling'

  # trap ctrl-c and call ctrl_c()
  trap ctrl_c SIGINT
  function ctrl_c() {
    mv *.log logs
    echo 'CPU profiling logs saved to ./logs'
  }
  npm run cpu-profiler
else
  npm start
fi

