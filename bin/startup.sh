#!/usr/bin/env bash

declare DIR
declare npm_exec

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
npm_exec="$(command -v npm | tee /dev/null 2>&1)"

cd "${DIR}" || exit
npm start

exit
