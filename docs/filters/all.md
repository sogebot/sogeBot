!> Response filters are usable in notices, custom commands, keywords and text overlay

## Global variables

`$sender`

- returns username of viewer, who triggered this message

`$source`

- returns source of this message (twitch or discord), if comes from
bot it is twitch by default

`$price`

- returns command price

`$game`

- return current game

`$thumbnail`

- return current thumbnail link without defined size, e.g. `https://static-cdn.jtvnw.net/ttv-boxart/33214-{width}x{height}.jpg`

`$thumbnail(WIDTHxHEIGHT)`

- return current thumbnail link
- `$thumbnail(150x200)` will return e.g. `https://static-cdn.jtvnw.net/ttv-boxart/33214-150x200.jpg`

`$title`

- return current status

`$language`

- return current stream language

`$viewers`

- return current viewers count

`$followers`

- return current followers count

`$subscribers`

- return current subscribers count

`$bits`

- return current bits count received during current stream

`$ytSong`

- return current song playing in YTplayer widget

`$spotifySong`

- return current song playing in Spotify

`$lastfmSong`

- return current song playing in Last.fm

`$latestFollower`

- Latest Follower

`$latestSubscriber`

- Latest Subscriber

`$latestSubscriberMonths`

- Latest Subscriber cumulative months

`$latestSubscriberStreak`

- Latest Subscriber months streak

`$latestTipAmount`

- Latest Tip (amount)

`$latestTipCurrency`

- Latest Tip (currency)

`$latestTipMessage`

- Latest Tip (message)

`$latestTip`

- Latest Tip (username)

`$latestCheerAmount`

- Latest Cheer (amount)

`$latestCheerMessage`

- Latest Cheer (message)

`$latestCheer`

- Latest Cheer (username)

`$toptip.overall.username`

- Overall top tip (username)

`$toptip.overall.amount`

- Overall top tip (amount)

`$toptip.overall.currency`

- Overall top tip (currency)

`$toptip.overall.message`

- Overall top tip (message)

`$toptip.stream.username`

- Current stream top tip (username)

`$toptip.stream.amount`

- Current stream top tip (amount)

`$toptip.stream.currency`

- Current stream top tip (currency)

`$toptip.stream.message`

- Current stream top tip (message)

`$version`

- return current bot version

`$isBotSubscriber`

- return true/false (boolean) if bot is subscriber

`$isStreamOnline`

- return true/false (boolean) if stream is online

`$uptime`

- return uptime of the stream

`$channelDisplayName`

- return channel display name

`$channelUserName`

- return channel user names

## Count subs / follows/ bits / tips in date interval

- `(count|subs|<interval>)`
- return subs+resubs count in interval
  - **example:**
    - `(count|subs|day)`
- `(count|follows|<interval>)`
- return follows count in interval
  - **example:**
    - `(count|follows|month)`
- `(count|tips|<interval>)`
- return tips count in interval
  - **example:**
    - `(count|tips|year)`
- `(count|bits|<interval>)`
- return bits count in interval
  - **example:**
    - `(count|bits|week)`

- available **interval**: hour, day, week, month, year

## Eval

`(eval <yourJScode>)`

- will evaluate your javascript code - there **must** be return value

## If

`(if '$game'=='Dota 2'|Is dota|Is not dota)`

- will evaluate your javascript if code, string check

`(if $viewers>5|Is more than 5 viewers|Is less)`

- will evaluate your javascript if code, int check

`(if $viewers>5|Is more than 5 viewers)`

- will evaluate your javascript if code, without else

## Online/offline filters

`(onlineonly)`

- will enable command only if stream is online

`(offlineonly)`

- will enable command only if stream is offline

## Math filters

- `(math.#)`
- solve a math problem
  - **example:**
    - `(math.5+6)`
    - `(math.$bits*2)`
    - usable with variables in events
- `(toPercent.#)`
- change float number to percent
  - **example:**
    - `(toPercent|2|0.5)` => 50.00
    - `(toPercent|0.5)` => 50
    - `(toPercent|0.4321)` => 43
    - `(toPercent|2|0.43211123)` => 43.21
- `(toFloat.#)`
- formats a number using fixed-point notation.
  - **example:**
    - `(toFloat|2|0.5)` => 0.50
    - `(toFloat|0.5)` => 1
    - `(toFloat|2|0.43211123)` => 0.43
    - `(toFloat|0.4321)` => 0

## Random filters

`(random.online.viewer)`

- returns random online viewer

`(random.online.subscriber)`

- returns random online subscriber

`(random.viewer)`

- returns random viewer (offline included)

`(random.subscriber)`

- returns random subscriber (offline included)

`(random.number-#-to-#)`

- returns random number from # to # - example: `(random.number-5-to-10)`

`(random.true-or-false)`

- returns randomly true/false

## Custom variables

**\#** is name of variable, e.g. mmr as `$_mmr`

`$_#`

- will set value for specified variable **if** argument is passed, else will return its value

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
  - _bot response_: `My MMR value is 1000`
  - _chat:_ `!mmr +500` < only for owners and mods
  - _bot response_: `@soge__, mmr was set to 1500.`
  - _chat:_ `!mmr -500` < only for owners and mods
  - _bot response_: `@soge__, mmr was set to 1000.`

`$!_#`

- same as variable above, except set message is always silent

`$!!_#`

- full silent variable, useful in multi responses where first response
          might be just setting of variable

`$touser`

- is user param variable, if empty, current user is used. This
param accepts `@user` and `user`

- **example:**
  - _command:_ `!point`
  - _response:_ `$sender point to $touser`
  - _chat:_ `!point @soge__`
  - _bot response_: `@foobar points to @soge__`
- **example:**
  - _command:_ `!point`
  - _response:_ `$sender point to $touser`
  - _chat:_ `!point soge__`
  - _bot response_: `@foobar points to @soge__`
- **example:**
  - _command:_ `!point`
  - _response:_ `$sender point to $touser`
  - _chat:_ `!point`
  - _bot response_: `@foobar points to @foobar`

`$param`

- is required temporary variable (command without param will not show)

- **example:**
  - _command:_ `!say`
  - _response:_ `$sender said: $param`
  - _chat:_ `!say Awesome!`
  - _bot response_: `@foobar said: Awesome!`

`$!param`

- is not required temporary variable

- **example:**
  - _command:_ `!say`
  - _response:_ `$sender said: $!param`
  - _chat:_ `!say Awesome!`
  - _bot response_: `@foobar said: Awesome!`

## URI safe strings

`(url|Lorem Ipsum Dolor)`

- will generate url safe string to be used in GET

`(url|$param)`

- will generate url safe from variable $param

## Custom APIs

`(api|http://your.desired.url)`

- will load data from specified url - only **UTF-8** responses are supported

`(api|http://your.desired.url?query=$querystring)`

- will load data from specified url with specified *querystring*

`(api._response)`

- returns response, if api response is string

- **example:**
  - _command:_ `!stats`
  - _response:_ `(api|https://csgo-stats.net/api/nightbot/rank/sogehige/sogehige) (sender), (api._response)`
  - _chat:_ `!stats`
  - _bot response_: `@foobar , Kills: 47182, Deaths: 47915, K/D: 0.98, Headshots: 39.0%, Accuracy: 18.5% - https://csgo-stats.net/player/sogehige/`

`(api.#)`

- returns json data of specified attribute

- JSON arrays are accesible as well - _example:_ `(api.some[0].value[1])`
- **example:**
  - _command:_ `!api`
  - _response:_ `(api|https://jsonplaceholder.typicode.com/posts/5) UserId: (api.userId), id: (api.id), title: (api.title), body: (api.body)`
  - _chat_: `!api`
  - _bot response_: `UserId: 1, id: 5, title: nesciunt quas odio, body: repudiandae veniam quaerat sunt sedalias aut fugiat sit autem sed estvoluptatem omnis possimus esse voluptatibus quisest aut tenetur dolor neque`

### GET parameters

You can add parameters to your urls, _note_ you must escape your parameters where
needed.

e.g. `(api|https://httpbin.org/get?test=a\\nb) Lorem (api.args.test)`

## Command filters

`$count`

- return how many times current command was used

`$count('!another')`

- return how many times `!another` command was used

`(!<command> <argument>)`

- run `!<command> argument`

`(!points add $sender 1000)`

- run `!points add soge__ 1000`

`(!points add $param 1000)`

- run `!points add $param 1000`

`(!<command>.<argument>)`

- run `!<command> <argument>`

`(!<command>)`

- run `!<command>`

`(!!<command>)`

- run command **silently**

**Usage 1:**

- _command:_ `!buypermit`
- _response:_ `(!permit.sender) You have bought a 1 link permit for (price)`
- _chat:_ `foobar: !buypermit`
- _bot example response in chat_: `You have bough  a 1 link permit for 100 Points`
- Bot will then send permit command for sender `!permit foobar` with _muted_ permit message

**Usage 2:**

- _command:_ `!play`
- _response:_ `(!songrequest.J73cZQzhPW0) You just requested some song!`
- _chat:_ `foobar: !play`
- _bot example response in chat_: `You just requested some song!`
- Bot will then send songrequest command for id `!songrequest J73cZQzhPW0` with _muted_ songrequest message

## Stream filters

`(stream|#name|game)`

- returns game of `#name` channel, it something went wrong, returns `n/a`

`(stream|#name|title)`

- returns title of `#name` channel, it something went wrong, returns `n/a`

`(stream|#name|viewers)`

- returns viewers count of `#name` channel, it something went wrong, returns `0`

`(stream|#name|link)`

- returns link to twitch `#name` channel -> 'twitch.tv/#name'

`(stream|#name|status)`

- returns status of twitch `#name` channel -> 'live' | 'offline'

## YouTube filters

`$youtube(url, <channel-or-user>)`

- returns latest video link e.g.
`$youtube(url, stejk01)`

`$youtube(title, <channel-or-user>)`

- returns latest video title e.g.
`$youtube(title, stejk01)`

## List filters

`(list.alias)`

- will return list of your visible aliases

`(list.alias|<group>)`

- will return list of your visible aliases for group

`(list.alias|)`

- will return list of your visible aliases without any group

`(list.!alias)`

- will return list of your visible !aliases

`(list.!alias|<group>)`

- will return list of your visible !aliases for group

`(list.!alias|)`

- will return list of your visible !aliases without any group

`(list.price)`

- will return list of your set prices

`(list.command)`

- will return list of your visible custom commands

`(list.command.<permissionName>)`

- will return list of your visible custom commands for permission

`(list.command|<group>)`

- will return list of your visible !commands for group

`(list.command|)`

- will return list of your visible !commands without any group

`(list.!command)`

- will return list of your visible custom !commands

`(list.!command|<group>)`

- will return list of your visible !commands for group

`(list.!command|)`

- will return list of your visible !commands without any group

`(list.!command.<permissionName>)`

- will return list of your visible custom !commands for permission

`(list.core.<permissionName>)`

- will return list of your visible custom core commands for permission

`(list.!core.<permissionName>)`

- will return list of your visible custom core !commands for permission

`(list.cooldown)`

- will return list of your cooldowns (keywords and !commands)

`(list.ranks)`

- list of your ranks

`(list.ranks.sub)`

- list of your ranks

**Usage:**

- _command:_ `!list`
- _response:_ `My uber super awesome command list: (list.commands)`
- _chat:_ `foobar: !list`
- _bot example response in chat_: `My uber super awesome command list: test, test2`
