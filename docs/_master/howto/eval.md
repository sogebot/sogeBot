These `eval` snippets are working with custom commands responses

#### Available eval variables
**_**: lodash - see https://lodash.com/docs/

**is**: sender informations - is.subscriber, is.mod, is.online

**random**: same values as random filter - random.viewer, random.online.viewer....if no user is selected -> null

**sender**: current user who evoked eval

**param**: param of command

**users**: list of all users in db

#### Available eval functions
###### url()
  - returns loaded axios response object
  - e.g `let api = url('https://jsonplaceholder.typicode.com/posts')`

### 8ball game
**command:** `!8ball`

**response:** `$sender asks '(param)' - (eval var sayings = ['Signs point to yes.', 'Yes.', 'Reply hazy, try again.', 'My sources say no.', 'You may rely on it.', 'Concentrate and ask again.', 'Outlook not so good.', 'It is decidedly so.', 'Better not tell you now.', 'Very doubtful.', 'Yes - definitely.', 'It is certain.', 'Cannot predict now.', 'Most likely.', 'Ask again later.', 'My reply is no.', 'Outlook good.', "Don't count on it."]; return sayings[Math.floor(Math.random() * sayings.length)];)`

### Multitwitch url generator
**command:** `!multi`

**response:** `(eval if (param.length === 0) return ''; else return 'http://multitwitch.tv/' + param.replace(/ /g, '/');)`

### Love command

**command:** `!love`

**response:** `There is a (random.number-0-to-100)% chance of love between $sender and $param`

### Custom variable increment
#### Custom variable command
**command:** `!testvariable `

**response:** `$_test`

#### Eval command
**command:** `!inc`

**response:** `(eval return '(!testvariable ' + (parseInt('$_test', 10)+1) + ')')`

**response 2 (if you want quiet command):** `(eval return '(!!testvariable ' + (parseInt('$_test', 10)+1) + ')')`

#### Shoutout command
**command:** `!shoutout`

**response:** `Shoutout to $param! Playing (stream|$param|game) - (stream|$param|title) for (stream|$param|viewers) viewers! Check it out (stream|$param|link)!`