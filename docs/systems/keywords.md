## Add a new keyword

`!keyword add (-p <uuid|name>) (-s) -k <regexp-or-keyword> -r <response>`

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
- `-k <regexp-or-keyword>`
  - keyword or regexp to be added
- `-r <response>`
  - response to be set

### Examples

<blockquote>
  <strong>testuser:</strong> !keyword add -k test -r me<br>
  <strong>bot:</strong> @testuser, keyword test (7c4fd4f3-2e2a-4e10-a59a-7f149bcb226d) was added.
</blockquote>

<blockquote>
  <em>/ create keyword as regexp /</em><br>
  <strong>testuser:</strong> !keyword add -k (lorem|ipsum) -r me<br>
  <strong>bot:</strong> @testuser, keyword (lorem|ipsum) was added.
</blockquote>

<blockquote>
  <em>/ create keyword only for mods /</em><br>
  <strong>testuser:</strong> !keyword add -p mods -k test -r me<br>
  <strong>bot:</strong> @testuser, keyword test (7c4fd4f3-2e2a-4e10-a59a-7f149bcb226d) was added.
</blockquote>

<blockquote>
  <em>/ create keyword only for mods and stop if executed /</em><br>
  <strong>testuser:</strong> !keyword add -p mods -s true -k test -r me<br>
  <strong>bot:</strong> @testuser, keyword test (7c4fd4f3-2e2a-4e10-a59a-7f149bcb226d) was added.
</blockquote>

## Edit a response of keyword

`!keyword edit (-p <uuid|name>) (-s) -k <keyword-or-regexp-or-uuid> -rid <responseId> -r <response>`

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
- `-k <keyword-or-regexp-or-uuid>`
  - keyword/uuid/regexp to be edited
- `-rid <responseId>`
  - response id to be updated
- `-r <response>`
  - response to be set

### Examples

<blockquote>
  <strong>testuser:</strong> !keyword edit -k test -rid 1 -r me<br>
  <strong>bot:</strong> @testuser, keyword test is changed to 'me'
</blockquote>

<blockquote>
  <em>/ set keyword only for mods /</em><br>
  <strong>testuser:</strong> !keyword edit -p mods -k test -rid 1 -r me<br>
  <strong>bot:</strong> @testuser, keyword test is changed to 'me'
</blockquote>

<blockquote>
  <em>/ set keyword only for mods and stop if executed /</em><br>
  <strong>testuser:</strong> !keyword edit -p mods -s true -k test -rid 1 -r me<br>
  <strong>bot:</strong> @testuser, keyword test is changed to 'me'
</blockquote>

## Remove a keyword or a response

`!keyword remove -k <keyword-or-regexp-or-uuid> (-rid <responseId>)`

!> Default permission is **CASTERS**

### Parameters

- `-k <keyword-or-regexp-or-uuid>`
  - keyword/uuid/regexp to be removed
- `-rid <responseId>`
  - *optional*
  - response id to be updatedremoved

### Examples

<blockquote>
  <strong>testuser:</strong> !keyword remove -k test <br>
  <strong>bot:</strong> @testuser, keyword test was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !keyword remove -c !nonexisting <br>
  <strong>bot:</strong> @testuser, keyword test was not found
</blockquote>

<blockquote>
  <strong>testuser:</strong> !keyword remove -k test -rid 1<br>
  <strong>bot:</strong> @testuser, keyword test was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !keyword remove -k test -rid 2 <br>
  <strong>bot:</strong> @testuser, response #2 of keyword test
  was not found in database
</blockquote>

## List of keywords

`!keyword list`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !keyword list<br>
  <strong>bot:</strong> @testuser, list of keywords: !keyword1, !keyword2
</blockquote>

## List of keyword responses

`!keyword list !keyword`

!> Default permission is **CASTERS**

### Output

!`keyword`#`responseId` (for `permission`) `stop`| `response`

### Examples

<blockquote>
  <strong>testuser:</strong> !keyword list test<br>
  <strong>bot:</strong> test#1 (for viewers) v| Some response of keyword<br>
  <strong>bot:</strong> test#2 (for mods) _| Some response of keyword
</blockquote>

## What is stop execution after response

In certain situations, you may have several responses based on permission.
Some users have higher permission then others. If response with
this settings is executed, all responses below this response will
be ignored.

### Example without stop

#### Responses in keyword test

- `owner` - response1
- `mods` - response2
- `viewers` - response3

<blockquote>
  <strong>owneruser:</strong> test<br>
  <strong>bot:</strong> response1<br>
  <strong>bot:</strong> response2<br>
  <strong>bot:</strong> response3<br>
</blockquote>

<blockquote>
  <strong>moduser:</strong> test<br>
  <strong>bot:</strong> response2<br>
  <strong>bot:</strong> response3<br>
</blockquote>

<blockquote>
  <strong>vieweruser:</strong> test<br>
  <strong>bot:</strong> response3<br>
</blockquote>

### Example with stop

#### Responses in keyword test

- `owner` - response1
- `mods` - response2 - `stop here`
- `viewers` - response3

<blockquote>
  <strong>owneruser:</strong> test<br>
  <strong>bot:</strong> response1<br>
  <strong>bot:</strong> response2<br>
</blockquote>

<blockquote>
  <strong>moduser:</strong> test<br>
  <strong>bot:</strong> response2<br>
</blockquote>

<blockquote>
  <strong>vieweruser:</strong> test<br>
  <strong>bot:</strong> response3<br>
  <em>/ response 3 is returned, because response2 was not, so
  execution was not stopped! /</em>
</blockquote>

## Command filters

You can add filter for keywords through UI. All filters are checked by **javascript**
engine.

### Available filters

Available filters can be found in UI.

#### Examples

`$sender == 'soge__'` - run keyword only for soge__

`$source == 'discord'` - run keyword only if comes from discord

`$game == 'PLAYERUNKNOWN'S BATTLEGROUNDS'` - run keyword only when PUBG is set
as game

`$sender == 'soge__' && $game == 'PLAYERUNKNOWN'S BATTLEGROUNDS'` - run keyword
only for soge__ **and** when game is set to PUBG

`$sender == 'soge__' || $game == 'PLAYERUNKNOWN'S BATTLEGROUNDS'` - run keyword
only for soge__ **or** when game is set to PUBG

`$subscribers >= 10` - run keyword when current subscribers count is equal or
greater than 10

#### Examples (advanced)

`$game.toLowerCase() == 'playerunknown's battlegrounds'` - run keyword only when
PUBG is set as game

`['soge__', 'otheruser'].includes($sender)` - check if sender is soge__ or otheruser

## Other settings

### Enable or disable custom keywords system

`!enable system keywords` |
`!disable system keywords`

!> Default permission is **CASTERS**