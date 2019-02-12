!> You need to have **alias** system enabled

## Example (random)

### Custom variable $_randomCommands

For randomizing commands, you will need to create **eval** custom variable with
run script set to **When variable is used**

```javascript
// set of commands
const commands = [
    '!me',
    '!top time',
    '!points',
];

// return random command
return _.sample(_.shuffle(commands));
```

### Alias configuration

Create alias `!youraliashere` with response `$_randomCommands`, this will
trigger random command.

## Example (unique)

### Custom variable $_randomCommandsUnique

For randomizing commands, you will need to create **eval** custom variable with
run script set to **When variable is used**

```javascript
// _current variable comes from bot containing current value

// set of commands
const commands = [
    '!me',
    '!top time',
    '!points',
];

// return random command
let unique = _current
while (unique === _current) {
  unique = _.sample(_.shuffle(commands));
}
return unique;
```

### Alias configuration

Create alias `!youraliashere2` with response `$_randomCommandsUnique`, this will
trigger random command.