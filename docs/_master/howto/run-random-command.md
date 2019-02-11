!> You need to have **alias** system enabled

## Example

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
return _.sample(commands);
```

### Alias configuration

Create alias `!youraliashere` with response `$_randomCommands`, this will
trigger random command.