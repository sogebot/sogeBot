!> This guide is for **advanced** users.

* new systems must be in `/src/bot/systems/` or `/src/bot/games/` folder

> Games are set as opt-in, by default they are disabled

## System template

``` javascript
'use strict'

// bot libraries
const constants = require('../constants')
const System = require('./_interface')

class Yoursystem extends System {
  constructor () {
    const dependsOn = []
    const settings = {
      commands: [],
      parsers: []
    }
    super({settings, dependsOn})
  }
}

module.exports = new Yoursystem()
```

### Depends on different system
Some systems have dependencies, e.g. bet system cannot work without points system

``` javascript
const dependsOn = [
  'systems.points'
]
```

### Settings variable
Settings variable may contain settings for `yoursystem`

#### Commands
##### Required values
- `name`: name of command started with `!`, this is how you will trigger command, e.g. `!command`, `!command help`

##### Default values
- `permission`: sets default permission for command. `constants.VIEWERS`
- `fnc`: created from second part of command name, if there is no second part `main` is default function
- `isHelper`: mark this command as helper function (e.g. price check is skipped for this command). `false`

``` javascript
const settings = {
  // ...
  commands: [
    '!command1', // creates !command1 with default values
    { name: '!command2' }, // same as !command1
    { name: `!command3`, fnc: 'command3', permission: constants.OWNER_ONLY } // with custom values
  ],
  // ...
}
```

#### Parsers
##### Required values
- `name`: name of parser, this will also set function which will run in system

##### Default values
- `fireAndForget`: if parser should run in background and we don't care about result, e.g. stats counting. `false`
- `priority`: what priority should be given to parser, higher priority, sooner it will run. `constants.LOW`
- `permission`: sets default permission for parser. `constants.VIEWERS`

``` javascript
const settings = {
  // ...
  parsers: [
    { name: 'run' },
    { name: 'stop', fireAndForget: true } // with custom values
  ],
  // ...
}
```

#### Others
You can set your own settings variables. Only `number`, `boolean` and `string` is supported.

##### Configurable in UI
``` javascript
const settings = {
  // ...
  mySettingValueNum: 1,
  mySettingValueBool: true,
  mySettingValueString: 'Lorem Ipsum',
  // ...
}
```
##### Not configurable
``` javascript
const settings = {
  // ...
  _: {
    mySettingValueNum: 1,
    mySettingValueBool: true,
    mySettingValueString: 'Lorem Ipsum'
  }
  // ...
}
```

## Database collections
In systems, you can use `this.collection` object variable to be consistent in collection names.

!> You cannot use `this.collection`, but you need to specify category `this.collection.category`

### Examples with `yoursystem`
`this.collection.data` -> `systems.yoursystem`

`this.collection.users` -> `systems.yoursystem.users`

`this.collection.settings` -> `systems.yoursystem.settings`

## Command function
Command function have `opts` object parameter
``` javascript
function commandFunction(opts) {
  /*
    opts: {
      sender: <senderObject>,
      command: <command used, e.g. !command>,
      parameters: <trimmed parameters AFTER command>
    }
  */
}
```

## Parser function
Parser function have `opts` object parameter. Must return **true** or **false**. Return **false** will halt all next parser and commands.

``` javascript
function parserFunction(opts) {
  /*
    opts: {
      sender: <senderObject>,
      message: <trimmed full message>,
      skip: true/false
    }
  */

  return true
  // return false
}
```