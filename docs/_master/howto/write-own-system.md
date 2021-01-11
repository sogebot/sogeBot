!> This guide is for **advanced** users.

* new systems must be in `/src/bot/systems/` or `/src/bot/games/` folder

> Games are set as opt-in, by default they are disabled

## System template

``` typescript
// bot libraries
const constants = require('../constants')
import System from './_interface';
import { command, default_permission, parser, settings, ui, shared } from '../decorators';
import { permissions } from '../permission'; // set of core permissions

class Yoursystem extends System {
  public dependsOn: string[] = []

  @settings('myCategory')
  yourSettingsVariableInMyCategory: string = 'lorem'

  @settings()
  yourSettingsVariableWithoutMyCategory: string = 'ipsum'
}

export default Yoursystem;
```

### Disable system by default

``` typescript
class Yoursystem extends System {
  _enabled: boolean = false;

  // ...
}
```


### Depends on different system

Some systems have dependencies, e.g. bet system cannot work without points system

``` typescript
class Yoursystem extends System {
  public dependsOn: string[] = ['systems.points']

  // ...
}
```

### Settings variable

**@settings(category?: string)** variable may contain settings for `yoursystem`,
customizable through ui and are saved in db

``` typescript
class Yoursystem extends System {
  @settings('myCategory')
  yourSettingsVariableInMyCategory: string = 'lorem'

  @settings()
  yourSettingsVariableWithoutMyCategory: string = 'ipsum'
  // ...
}
```

### Shared variable

**@shared()** variables are shared through workers and should be correctly accesible
in master and worker

``` typescript
class Yoursystem extends System {
  @shared()
  yourSharedVariableShouldBeSameAcrossThreads: string = 'lorem'
  // ...
}
```

#### Commands

To define function, which should be command, you must use decorator **@command**.
To override default permission for viewers, use **@default_permission**.
For setting helper function (e.g. price check is skipped for this command) use **@helper**.

``` javascript
@command('!yourcommand')
@default_permission(defaultPermissions.CASTERS)
@helper()
public foobar(opts: CommandOptions): CommandResponse[] {
  // ... command logic ...
}
```

#### Parsers

To define function, which should be command, you must use decorator **@parser**.

##### Parser options

* `fireAndForget`: if parser should run in background and we don't care about
  result and will not rollback, e.g. stats counting. `false`
* `priority`: what priority should be given to parser, higher priority, sooner
  it will run. `constants.LOW`
* `permission`: sets default permission for parser. `defaultPermissions.VIEWERS`

``` typescript
@parser()
public someParser(opts: ParserOptions) {
  // ... parser logic ...
}

@parser({ fireAndForget: true })
public anotherParser(opts: ParserOptions) {
  // ... parser logic ...
}
```

## Database collections

In systems, you can use `this.collection` object variable to be consistent
in collection names.

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

Parser function have `opts` object parameter. Must return **true** or **false**.
Return **false** will halt all next parser and commands.

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

## Locales

Bot is supporting custom locales (by default **english** and **čeština** are supported).
To create new locale file add **json** file into `/locales/<lang>` folder.

``` javascript
import { prepare } from '../commons';

function someCommandFunctionExample(opts) {
  // given we have defined path.to.your.locale with value
  // Lorem Ipsum $dolor sit amet

  // default locale translations
  const defaultTranslation = global.translate('path.to.your.locale')
  // => Lorem Ipsum $dolor sit amet

  // locale translation with attributes
  const translation = prepare('path.to.your.locale', {
    dolor: 'something'
  })
  // => Lorem Ipsum something sit amet
}
```