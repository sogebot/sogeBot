!> Response filters are usable in notices, custom commands, keywords and text overlay

## Global variables
`$sender` - returns username of viewer, who triggered this message

`$price` - returns command price

`$game` - return current game

`$title` - return current status

`$viewers` - return current viewers count

`$views` - return current views count

`$hosts` - return current hosts count

`$followers` - return current followers count

`$subscribers` - return current subscribers count

`$bits` - return current bits count received during current stream

`$currentSong` - return current song playing in YTplayer widget

`$latestFollower` - Latest Follower

`$latestSubscriber` - Latest Subscriber

`$latestTipAmount` - Latest Tip (amount)

`$latestTipCurrency` - Latest Tip (currency)

`$latestTipMessage` - Latest Tip (message)

`$latestTip` - Latest Tip (username)

`$latestCheerAmount` - Latest Cheer (amount)

`$latestCheerMessage` - Latest Cheer (message)

`$latestCheer` - Latest Cheer (username)

## Eval
`(eval <yourJScode>)` - will evaluate your javascript code - there **must** be return value

## If
`(if '$game'=='Dota 2'|Is dota|Is not dota)` - will evaluate your javascript if code, string check

`(if $viewers>5|Is more than 5 viewers|Is less)` - will evaluate your javascript if code, int check

`(if $viewers>5|Is more than 5 viewers)` - will evaluate your javascript if code, without else

## Online/offline filters
`(onlineonly)` - will enable command only if stream is online

`(offlineonly)` - will enable command only if stream is offline

## Math filter
`(math.#)` - solve a math problem
  - **example:**
    - `(math.5+6)`
    - `(math.$bits*2)` - usable with variables in events

## Random filters
`(random.online.viewer)` - returns random online viewer

`(random.online.follower)` - returns random online follower

`(random.online.subscriber)` - returns random online subscriber

`(random.viewer)` - returns random viewer (offline included)

`(random.follower)` - returns random follower (offline included)

`(random.subscriber)` - returns random subscriber (offline included)

`(random.number-#-to-#)` - returns random number from # to # - example: `(random.number-5-to-10)`

`(random.true-or-false)` - returns randomly true/false

## Custom variables
**\#** is name of variable, e.g. mmr as `$_mmr`

`$_#` - will set value for specified variable **if** argument is passed, else will return its value
  - **example:**
    - _command:_ `!mmr`
    - _response:_ `My MMR value is $_mmr`
    - _chat:_ `!mmr 1000` < only for owners and mods
    - _bot response_: `@soge__, mmr was set to 1000.`
    - _chat:_ `!mmr`
    - _bot response_: `My MMR value is 1000`
    - _chat:_ `!mmr +` < only for owners and mods
    - _bot response_: `@soge__, mmr was set to 1001.`
    - _chat:_ `!mmr -` < only for owners and mods
    - _bot response_: `@soge__, mmr was set to 1000.`

`$!_#` - same as variable above, except set message is always silent

`$param` - is required temporary variable (command without param will not show)
  - **example:**
    - _command:_ `!say`
    - _response:_ `$sender said: $param`
    - _chat:_ `!say Awesome!`
    - _bot response_: `@foobar said: Awesome!`

`$!param` - is not required temporary variable
  - **example:**
    - _command:_ `!say`
    - _response:_ `$sender said: $!param`
    - _chat:_ `!say Awesome!`
    - _bot response_: `@foobar said: Awesome!`

## Custom APIs
`(api|http://your.desired.url)` - will load data from specified url - only **UTF-8** responses are supported

`(api|http://your.desired.url?query=$querystring)` - will load data from specified url with specified *querystring*

`(api._response)` - returns response, if api response is string
  - **example:**
    - _command:_ `!stats`
    - _response:_ `(api|https://csgo-stats.net/api/nightbot/rank/sogehige/sogehige) (sender), (api._response)`
    - _chat:_ `!stats`
    - _bot response_: `@foobar , Kills: 47182, Deaths: 47915, K/D: 0.98, Headshots: 39.0%, Accuracy: 18.5% - https://csgo-stats.net/player/sogehige/`

`(api.#)` - returns json data of specified attribute
  - JSON arrays are accesible as well - _example:_ `(api.some[0].value[1])`
  - **example:**
    - _command:_ `!api`
    - _response:_ `(api|https://jsonplaceholder.typicode.com/posts/5) UserId: (api.userId), id: (api.id), title: (api.title), body: (api.body)`
    - _chat_: `!api`
    - _bot response_: `UserId: 1, id: 5, title: nesciunt quas odio, body: repudiandae veniam quaerat sunt sedalias aut fugiat sit autem sed estvoluptatem omnis possimus esse voluptatibus quisest aut tenetur dolor neque`

## Command filters
`(!<command> <argument>)` - run `!<command> argument`

`(!points add $sender 1000)` - run `!points add soge__ 1000`

`(!points add $param 1000)` - run `!points add $param 1000`

`(!<command>.<argument>)` - run `!<command> <argument>`

`(!<command>)` - run `!<command>`

`(!!<command>)` - run command **silently**

**Usage 1:**
- _command:_ `!buypermit`
- _response:_ `(!permit.sender) You have bought a 1 link permit for (price)`
- _chat:_ `foobar: !buypermit`
- _bot example response in chat_: `You have bough  a 1 link permit for 100 Points`
- Bot will then send permit command for sender `!permit foobar` with *muted* permit message

**Usage 2:**
- _command:_ `!play`
- _response:_ `(!songrequest.J73cZQzhPW0) You just requested some song!`
- _chat:_ `foobar: !play`
- _bot example response in chat_: `You just requested some song!`
- Bot will then send songrequest command for id `!songrequest J73cZQzhPW0` with *muted* songrequest message

## Stream filters
`(stream|#name|game)` - returns game of `#name` channel, it something went wrong, returns `n/a`

`(stream|#name|title)` - returns title of `#name` channel, it something went wrong, returns `n/a`

`(stream|#name|viewers)` - returns viewers count of `#name` channel, it something went wrong, returns `0`

## List filters
`(list.alias)` - will return list of your visible aliases

`(list.!alias)` - will return list of your visible !aliases

`(list.commands)` - will return list of your visible custom commands

`(list.!commands)` - will return list of your visible custom !commands

`(list.cooldown)` - will return list of your cooldowns (keywords and !commands)

`(list.ranks)` - list of your ranks

**Usage:**
- _command:_ `!list`
- _response:_ `My uber super awesome command list: (list.commands)`
- _chat:_ `foobar: !list`
- _bot example response in chat_: `My uber super awesome command list: test, test2`