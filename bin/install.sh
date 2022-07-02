#!/usr/bin/env bash

declare DIR
declare npm_exec

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd "${DIR}" || exit

rm -rf node_modules &
echo -n 'Purging old dependencies'
while kill -0 $! 2> /dev/null; do
    echo -n '.'
    sleep 1
done
echo '.DONE'

echo -n 'Installing dependencies'
npm install > /dev/null 2>&1 &
while kill -0 $! 2> /dev/null; do
    echo -n '.'
    sleep 1
done
echo '.DONE'
