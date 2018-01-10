'use strict'

const XRegExp = require('xregexp')

function define (name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  })
}

// Permissions
define('OWNER_ONLY', 0)
define('VIEWERS', 1)
define('MODS', 2)
define('REGULAR', 3)
define('DISABLE', -1)

// Connection status
define('DISCONNECTED', 0)
define('CONNECTING', 1)
define('RECONNECTING', 2)
define('CONNECTED', 3)

// regexp
define(
  'USERNAME_REGEXP',
  XRegExp(`@?(?<username> .* )`, 'ix')
)

define(
  'COMMAND_REGEXP',
  XRegExp(`!(?<command> [\\pL]* ) # command`, 'ix')
)

define(
  'COMMAND_REGEXP_WITH_SPACES',
  XRegExp(`!(?<command> [\\pL ]* ) # command`, 'ix')
)

define(
  'ALIAS_REGEXP',
  XRegExp(`!(?<alias> [\\pL ]*   ) # alias
           \\s                     # empty space
           !(?<command> [\\pL ]* ) # command`, 'ix')
)

define(
  'COOLDOWN_REGEXP',
  XRegExp(`(?<command> !?[\\pL ]* ) # command
           \\s                      # empty space
           (?<type> global|user   ) # type`, 'ix')
)

define(
  'PERMISSION_REGEXP',
  XRegExp(`(?<type> viewer|mods|owner|regular|disable ) # type
           \\s                                          # empty space
           !?(?<command> [\\pL ]*                     ) # command`, 'ix')
)

define('KEYWORD_REGEXP', XRegExp(`(?<keyword> !?[\\pL]*)\\s(?<response> .*)`, 'ix'))

define(
  'COOLDOWN_REGEXP_SET',
  XRegExp(`(?<command> !?[\\pL ]* ) # command
           \\s                      # empty space
           (?<type> global|user   ) # type
           \\s                      # empty space
           (?<seconds> \\d*       ) # seconds
           ?\\s                     # empty space
           ?(?<quiet> \\w*        ) # optional-quiet`, 'ix')
)

define(
  'COMMAND_REGEXP_WITH_RESPONSE',
  XRegExp(`!(?<command> [\\pL]* ) # command
           \\s                    # empty space
           (?<response> .*      ) # response`, 'ix')
)

define(
  'COMMAND_REGEXP_WITH_OPTIONAL_RESPONSE',
  XRegExp(`!(?<command> [\\pL]* ) # command
           ?\\s                   # empty space
           ?(?<response> .*     ) # optional response`, 'ix')
)
