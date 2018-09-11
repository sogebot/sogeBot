## Add a new command

`!command add <!command> <response>`

!> Default permission is **OWNER**

### Parameters

- `-ul` - *optional string* - required userlevel of user
  - *default value:* viewer
  - *available values:* viewer, mods, regular, owner
- `-s` - *optional boolean* - stop execution after response is sent
  - *default value:* false

### Examples

<blockquote>
  <strong>testuser:</strong> !command add !test me<br>
  <strong>bot:</strong> @testuser, command !test was added.
</blockquote>

<blockquote>
  <em>/ create command only for mods /</em><br>
  <strong>testuser:</strong> !command add -ul mods !test me<br>
  <strong>bot:</strong> @testuser, command !test was added.
</blockquote>

<blockquote>
  <em>/ create command only for mods and stop if executed /</em><br>
  <strong>testuser:</strong> !command add -ul mods -s true !test me<br>
  <strong>bot:</strong> @testuser, command !test was added.
</blockquote>

## Edit a response of command

`!command edit <!command> <responseId> <response>`

!> Default permission is **OWNER**

### Parameters

- `-ul` - *optional string* - required userlevel of user
  - *default value:* viewer
  - *available values:* viewer, mods, regular, owner
- `-s` - *optional boolean* - stop execution after response is sent
  - *default value:* false

### Examples

<blockquote>
  <strong>testuser:</strong> !command edit !test 1 me<br>
  <strong>bot:</strong> @testuser, command !test is changed to 'me'
</blockquote>

<blockquote>
  <em>/ set command only for mods /</em><br>
  <strong>testuser:</strong> !command edit -ul mods !test 1 me<br>
  <strong>bot:</strong> @testuser, command !test is changed to 'me'
</blockquote>

<blockquote>
  <em>/ set command only for mods and stop if executed /</em><br>
  <strong>testuser:</strong> !command edit -ul mods -s true !test 1 me<br>
  <strong>bot:</strong> @testuser, command !test is changed to 'me'
</blockquote>

## Remove a command

`!command remove <!command>`

!> Default permission is **OWNER**

### Examples

<blockquote>
  <strong>testuser:</strong> !command remove !test <br>
  <strong>bot:</strong> @testuser, command !test was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !command remove !nonexisting <br>
  <strong>bot:</strong> @testuser, command !test was not found
</blockquote>

## Remove a response of command

`!command remove <!command> <responseId>`

!> Default permission is **OWNER**

### Examples

<blockquote>
  <strong>testuser:</strong> !command remove !test 1<br>
  <strong>bot:</strong> @testuser, command !test was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !command remove !test 2 <br>
  <strong>bot:</strong> @testuser, response #2 of command !test
  was not found in database
</blockquote>

## List of commands

`!command list`

!> Default permission is **OWNER**

### Examples

<blockquote>
  <strong>testuser:</strong> !command list<br>
  <strong>bot:</strong> @testuser, list of commands: !command1, !command2
</blockquote>

## List of command responses

`!command list !command`

!> Default permission is **OWNER**

### Output

!`command`#`responseId` (for `userlevel`) `stop`| `response`

### Examples

<blockquote>
  <strong>testuser:</strong> !command list !test<br>
  <strong>bot:</strong> !test#1 (for viewers) v| Some response of command<br>
  <strong>bot:</strong> !test#2 (for mods) _| Some response of command
</blockquote>

## What is stop execution after response

In certain situations, you may have several responses based on userlevel.
Some users have higher userlevel then others. If response with
this settings is executed, all responses below this response will
be ignored.

### Userlevel hierarchy

`owner` > `mods` > `regular` > `viewer`

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

## Other settings

### Enable or disable custom commands system

`!enable system customCommands` |
`!disable system customCommands`

!> Default permission is **OWNER**