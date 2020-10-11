## Add a new command

`!command add (-p <uuid|name>) (-s) -c <!command> -r <response>`

!> Default permission is **CASTERS**

### Parameters

- `-p <uuid|name>`
  - *optional string / uuid* - can be used names of permissions or theirs exact uuid
  - *default value:* viewers
  - *available values:* list of permission can be obtained by `!permissions list`
    or in UI
- `-s`
  - *optional boolean* - stop execution after response is sent
  - *default value:* false
- `-c <!command>`
  - command to be added
- `-r <response>`
  - response to be set

### Examples

<blockquote>
  <strong>testuser:</strong> !command add -c !test -r me<br>
  <strong>bot:</strong> @testuser, command !test was added.
</blockquote>

<blockquote>
  <em>/ create command only for mods /</em><br>
  <strong>testuser:</strong> !command add -p mods -c !test -r me<br>
  <strong>bot:</strong> @testuser, command !test was added.
</blockquote>

<blockquote>
  <em>/ create command only for mods and stop if executed /</em><br>
  <strong>testuser:</strong> !command add -p mods -s true -c !test -r me<br>
  <strong>bot:</strong> @testuser, command !test was added.
</blockquote>

## Edit a response of command

`!command edit (-p <uuid|name>) (-s) -c <!command> -rid <responseId> -r <response>`

!> Default permission is **CASTERS**

### Parameters

- `-p <uuid|name>`
  - *optional string / uuid* - can be used names of permissions or theirs exact uuid
  - *default value:* viewers
  - *available values:* list of permission can be obtained by `!permissions list`
    or in UI
- `-s`
  - *optional boolean* - stop execution after response is sent
  - *default value:* false
- `-c <!command>`
  - command to be edited
- `-rid <responseId>`
  - response id to be updated
- `-r <response>`
  - response to be set

### Examples

<blockquote>
  <strong>testuser:</strong> !command edit -c !test -rid 1 -r me<br>
  <strong>bot:</strong> @testuser, command !test is changed to 'me'
</blockquote>

<blockquote>
  <em>/ set command only for mods /</em><br>
  <strong>testuser:</strong> !command edit -p mods -c !test -rid 1 -r me<br>
  <strong>bot:</strong> @testuser, command !test is changed to 'me'
</blockquote>

<blockquote>
  <em>/ set command only for mods and stop if executed /</em><br>
  <strong>testuser:</strong> !command edit -p mods -s true -c !test -rid 1 -r me<br>
  <strong>bot:</strong> @testuser, command !test is changed to 'me'
</blockquote>

## Remove a command or a response

`!command remove -c <!command> (-rid <responseId>)`

!> Default permission is **CASTERS**

### Parameters

- `-c <!command>`
  - command to be removed
- `-rid <responseId>`
  - *optional*
  - response id to be updatedremoved

### Examples

<blockquote>
  <strong>testuser:</strong> !command remove -c !test <br>
  <strong>bot:</strong> @testuser, command !test was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !command remove -c !nonexisting <br>
  <strong>bot:</strong> @testuser, command !test was not found
</blockquote>

<blockquote>
  <strong>testuser:</strong> !command remove -c !test -rid 1<br>
  <strong>bot:</strong> @testuser, command !test was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !command remove -c !test -rid 2 <br>
  <strong>bot:</strong> @testuser, response #2 of command !test
  was not found in database
</blockquote>

## List of commands

`!command list`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !command list<br>
  <strong>bot:</strong> @testuser, list of commands: !command1, !command2
</blockquote>

## List of command responses

`!command list !command`

!> Default permission is **CASTERS**

### Output

!`command`#`responseId` (for `permission`) `stop`| `response`

### Examples

<blockquote>
  <strong>testuser:</strong> !command list !test<br>
  <strong>bot:</strong> !test#1 (for viewers) v| Some response of command<br>
  <strong>bot:</strong> !test#2 (for mods) _| Some response of command
</blockquote>

## What is stop execution after response

In certain situations, you may have several responses based on permission.
Some users have higher permission then others. If response with
this settings is executed, all responses below this response will
be ignored.

### Example without stop

#### Responses in command !test

- `owner` - response1
- `mods` - response2
- `viewers` - response3

<blockquote>
  <strong>owneruser:</strong> !test<br>
  <strong>bot:</strong> response1<br>
  <strong>bot:</strong> response2<br>
  <strong>bot:</strong> response3<br>
</blockquote>

<blockquote>
  <strong>moduser:</strong> !test<br>
  <strong>bot:</strong> response2<br>
  <strong>bot:</strong> response3<br>
</blockquote>

<blockquote>
  <strong>vieweruser:</strong> !test<br>
  <strong>bot:</strong> response3<br>
</blockquote>

### Example with stop

#### Responses in command !test

- `owner` - response1
- `mods` - response2 - `stop here`
- `viewers` - response3

<blockquote>
  <strong>owneruser:</strong> !test<br>
  <strong>bot:</strong> response1<br>
  <strong>bot:</strong> response2<br>
</blockquote>

<blockquote>
  <strong>moduser:</strong> !test<br>
  <strong>bot:</strong> response2<br>
</blockquote>

<blockquote>
  <strong>vieweruser:</strong> !test<br>
  <strong>bot:</strong> response3<br>
  <em>/ response 3 is returned, because response2 was not, so
  execution was not stopped! /</em>
</blockquote>

## Command filters

You can add filter for commands through UI. All filters are checked by **javascript**
engine.

### Available filters

Available filters can be found in UI.

#### Examples

`$sender == 'soge__'` - run command only for soge__

`$source == 'discord'` - run command only if comes from discord

`$game == 'PLAYERUNKNOWN'S BATTLEGROUNDS'` - run command only when PUBG is set
as game

`$sender == 'soge__' && $game == 'PLAYERUNKNOWN'S BATTLEGROUNDS'` - run command
only for soge__ **and** when game is set to PUBG

`$sender == 'soge__' || $game == 'PLAYERUNKNOWN'S BATTLEGROUNDS'` - run command
only for soge__ **or** when game is set to PUBG

`$subscribers >= 10` - run command when current subscribers count is equal or
greater than 10

#### Examples (advanced)

`$game.toLowerCase() == 'playerunknown's battlegrounds'` - run command only when
PUBG is set as game

`['soge__', 'otheruser'].includes($sender)` - check if sender is soge__ or otheruser

## Other settings

### Enable or disable custom commands system

`!enable system customCommands` |
`!disable system customCommands`

!> Default permission is **CASTERS**