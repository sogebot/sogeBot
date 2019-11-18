#!/bin/bash
cd /app

$FILE= ./conf/ormconfig.json
if test -f "$FILE"; then
  cp $FILE ./ormconfig.json
  npm start
else
  echo "Customized ormconfig.json not found!!!" >& 2
  exit 1
fi

