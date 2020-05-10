#!/bin/bash
cd /app

# cleanup on start
rm /etc/cron.d/profiler
service cron restart
rm *.log

if [ -n $CPUPROFILER ]
then
  echo 'Starting with CPU profiling'

  echo 'Setting up cron for log files'
  echo '* * * * * cp /app/*.log /app/logs/' > /etc/cron.d/profiler
  echo '# Mandatory blank line' >> /etc/cron.d/profiler
  chmod 0644 /etc/cron.d/profiler
  service cron restart

  npm run cpu-profiler
else
  npm start
fi