#!/bin/bash
cd /app

export DOCKER_HOST_IP=`route -n | awk '/UG[ \t]/{print $2}'`

if [ "$DB" = 'mongodb' ]; then
  sed -i "s#nedb#mongodb#g" config.json
  sed -i 's#mongodb:\/\/localhost:27017\/your-db-name#'$MONGOURI'#g' config.json
  sed -i 's#localhost:#'$DOCKER_HOST_IP':#g' config.json # set docker host ip instead of localhost
  npm start
else
  echo "Please pass value for the MONGOURI environment variable"
fi
