'use strict'

const XRegExp = require('xregexp')

function define (name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  })
}

// PRIORITIES
define('MODERATION', -1)
define('HIGHEST', 0)
define('HIGH', 1)
define('MEDIUM', 2)
define('LOW', 3)
define('LOWEST', 4)

// Connection status
define('DISCONNECTED', 0)
define('CONNECTING', 1)
define('RECONNECTING', 2)
define('CONNECTED', 3)

// Time
define('SECOND', 1000)
define('MINUTE', 1000 * 60)
define('HOUR', 1000 * 60 * 60)
define('DAY', 1000 * 60 * 60 * 24)

// regexp
define(
  'USERNAME_REGEXP',
  XRegExp('@?(?<username> .* )', 'ix')
)

define(
  'COMMAND_REGEXP',
  XRegExp('(?<command> ![\\pL0-9]* ) # command', 'ix')
)

define(
  'COMMAND_REGEXP_WITH_SPACES',
  XRegExp('(?<command> ![\\pL0-9 ]* ) # command', 'ix')
)

define(
  'COOLDOWN_REGEXP',
  XRegExp(`(?<command> !?[\\pL0-9 ]* ) # command
           \\s                         # empty space
           (?<type> global|user      ) # type`, 'ix')
)

define('KEYWORD_REGEXP', XRegExp('(?<keyword> !?[\\pL0-9]*)\\s(?<response> .*)', 'ix'))

define(
  'COOLDOWN_REGEXP_SET',
  XRegExp(`(?<command> !?[\\pL0-9 ]* ) # command
           \\s                      # empty space
           (?<type> global|user   ) # type
           \\s                      # empty space
           (?<seconds> \\d*       ) # seconds
           ?\\s                     # empty space
           ?(?<quiet> \\w*        ) # optional-quiet`, 'ix')
)

define(
  'COMMAND_REGEXP_WITH_RESPONSE',
  XRegExp(`(?<premission> owner|mod|regular|viewer) # permission
           \\s                                      # empty space
           (?<command> ![\\pL0-9]*                ) # command
           \\s                                      # empty space
           (?<response> .*                        ) # response`, 'ix')
)

define(
  'COMMAND_REGEXP_WITH_OPTIONAL_RESPONSE',
  XRegExp(`!(?<command> [\\pL0-9]* ) # command
           ?\\s                   # empty space
           ?(?<response> .*     ) # optional response`, 'ix')
)
