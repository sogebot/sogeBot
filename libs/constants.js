'use strict'

function define (name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  })
}

define('OWNER_ONLY', 0)
define('VIEWERS', 1)
define('MODS', 2)
define('DISABLE', -1)
