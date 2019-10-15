import XRegExp from 'xregexp';

// PRIORITIES
export const MODERATION = -1;
export const HIGHEST = 0;
export const HIGH = 1;
export const MEDIUM = 2;
export const LOW = 3;
export const LOWEST = 4;

// Connection status
export const DISCONNECTED = 0;
export const CONNECTING = 1;
export const RECONNECTING = 2;
export const CONNECTED = 3;

// Time
export const SECOND = 1000;
export const MINUTE = 1000 * 60;
export const HOUR = 1000 * 60 * 60;
export const DAY = 1000 * 60 * 60 * 24;

// regexp
export const COMMAND_REGEXP = XRegExp('(?<command> ![\\pL0-9]* ) # command', 'ix');

export const COOLDOWN_REGEXP = XRegExp(`(?<command> !?[\\pL0-9 ]* ) # command
           \\s                         # empty space
           (?<type> global|user      ) # type`, 'ix');

export const KEYWORD_REGEXP = XRegExp('(?<keyword> !?[\\pL0-9]*)\\s(?<response> .*)', 'ix');

export const COOLDOWN_REGEXP_SET = XRegExp(`(?<command> !?[\\pL0-9 ]* ) # command
           \\s                      # empty space
           (?<type> global|user   ) # type
           \\s                      # empty space
           (?<seconds> \\d*       ) # seconds
           ?\\s                     # empty space
           ?(?<quiet> \\w*        ) # optional-quiet`, 'ix');