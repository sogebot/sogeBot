## Timers system
Timers system will periodically print out set responses, when certain requirements are met.

### Commands | OWNER
`!timers set -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] [-offline]` - will create or update timers with specified requirements to meet

`!timers unset -name [name-of-timer]` - remove timer and all responses

`!timers add -name [name-of-timer] -response '[response]'` - add response to specified timer

`!timers rm -id [id-of-response]` - remove response by id

`!timers list` - return list of timers

`!timers list -name [name-of-timer]` - return responses of specified timer

`!timers toggle -name [name-of-timer]` - enable/disable specified timer

`!timers toggle -id [id-of-response]` - enable/disable specified response

`!timers` - show timers system usage help