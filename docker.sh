#!/bin/bash
cd /app

export DOCKER_HOST_IP=`route -n | awk '/UG[ \t]/{print $2}'`

if [ "$TOKEN" = '__random__' ]; then
  export TOKEN=`cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1`
fi

sed -i 's#"domain": "localhost"#"domain": "localhost, '$DOMAIN'"#g' config.json
sed -i 's#"token": "7911776886"#"token": "'$TOKEN'"#g' config.json

if [ "$DB" = 'mongodb' ]; then
  sed -i "s#nedb#mongodb#g" config.json
  sed -i 's#mongodb:\/\/localhost:27017\/your-db-name#'$MONGOURI'#g' config.json
  sed -i 's#localhost:#'$DOCKER_HOST_IP':#g' config.json # set docker host ip instead of localhost
  npm start
else
  echo "Please pass value for the MONGOURI environment variable"
fi
