## Moderation system
### Commands
`!permit <username> <count:optional:default:1>` - **MODS** - user will be able to post a <count> of link without timeout

### Settings
- !set moderationLinks true/false
    - default: true
    - will enable/disable links moderation
- !set moderationLinksTimeout [seconds]
    - default: 120
    - how long will be user timeouted for links
- !set moderationSymbols true/false
    - default: true
    - will enable/disable symbols moderation
- !set moderationSymbolsTimeout [seconds]
    - default: 120
    - how long will be user timeouted for symbols
- !set moderationSymbolsTriggerLength [number-of-chars]
    - default: 15
    - chat messages with same or more than [number-of-chars] will be moderated with symbols
- !set moderationSymbolsMaxConsecutively [number-of-chars]
    - default: 10
    - how many symbols can be sent consecutively
- !set moderationSymbolsMaxPercent [percent]
    - default: 50
    - how many percentage of symbols can be in chat message
- !set moderationLongMessage true/false
    - default: true
    - will enable/disable long message moderation
- !set moderationLongMessageTimeout [seconds]
    - default: 120
    - how long will be user timeouted for symbols
- !set moderationLongMessageTriggerLength [number-of-chars]
    - default: 300
    - chat messages with same or more than [number-of-chars] will be moderated as long message
- !set moderationCaps true/false
    - default: true
    - will enable/disable caps moderation
- !set moderationCapsTimeout [seconds]
    - default: 120
    - how long will be user timeouted for caps
- !set moderationCapsTriggerLength [number-of-chars]
    - default: 15
    - chat messages with same or more than [number-of-chars] will be moderated with caps
- !set moderationCapsMaxPercent [percent]
    - default: 50
    - how many percentage of caps can be in chat message
- !set moderationSpam true/false
    - default: true
    - will enable/disable spam moderation
- !set moderationSpamTimeout [seconds]
    - default: 120
    - how long will be user timeouted for spam
- !set moderationSpamTriggerLength [number-of-chars]
    - default: 15
    - chat messages with same or more than [number-of-chars] will be moderated with spam
- !set moderationSpamMaxLength [number-of-chars]
    - default: 15
    - how long spam messages can be expected (example: lorem ipsum lorem ipsum -> 'lorem ipsum' = 11 chars)
- !set moderationEmotes true/false
    - default: true
    - will enable/disable emotes moderation
- !set moderationEmotesTimeout [seconds]
    - default: 120
    - how long will be user timeouted for emotes
- !set moderationEmotesMaxCount [number-of-emotes]
    - default: 15
    - chat messages with same or more than [number-of-emotes] will be moderated with emotes
- !set moderationWarnings [number]
    - default: 0
    - will enable additional warnings before timeout
- !set moderationWarningsTimeouts true/false
    - default: true
    - will enable/disable timeouts warnings

    You can blacklist/whitelist words in UI `settings->moderation`

## Blacklisting and whitelisting words
#### Available special characters
- asterisk -> `*` - zero or more chars
- plus -> `+` - one or more chars

#### Examples
- `test*`
  - `test` - ✓
  - `test1` - ✓
  - `testa` - ✓
  - `atest` - X
- `test+`
  - `test` - X
  - `test1` - ✓
  - `testa` - ✓
  - `atest` - X
- `test`
  - `test` - ✓
  - `test1` - X
  - `testa` - X
  - `atest` - X

## URL whitelisting

Use this pattern to whitelist your desired url. Change `example.com` to what you want.

`(https?:\/\/)?(www\.)?example.com(*)?` or `domain:example.com`