## Add a new alias

`!alias add (-p <uuid|name>) -a <!alias> -c <!command>`

!> Default permission is **CASTERS**

### Parameters

- `-p <uuid|name>`
  - *optional string / uuid* - can be used names of permissions or theirs exact uuid
  - *default value:* viewers
  - *available values:* list of permission can be obtained by `!permissions list`
    or in UI
- `-a <!alias>`
  - alias to be added
- `-c <!command>`
  - command to be aliased

### Examples

<blockquote>
  <strong>testuser:</strong> !alias add -p viewers -a !uec -c !points <br>
  <strong>bot:</strong> @testuser, alias !uec for !points was added
</blockquote>

## Edit an alias

`!alias edit (-p <uuid|name>) -a <!alias> -c <!command>`

!> Default permission is **CASTERS**

### Parameters

- `-p <uuid|name>`
  - *optional string / uuid* - can be used names of permissions or theirs exact uuid
  - *default value:* viewers
  - *available values:* list of permission can be obtained by `!permissions list`
    or in UI
- `-a <!alias>`
  - alias to be added
- `-c <!command>`
  - command to be aliased

### Examples

<blockquote>
  <strong>testuser:</strong> !alias edit -p viewers -a !uec -c !me <br>
  <strong>bot:</strong> @testuser, alias !uec is changed to !me
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !alias edit viewer !nonexisting !points <br>
  <strong>bot:</strong> @testuser, alias !nonexisting was not found in database
</blockquote>

## Remove an alias

`!alias remove <!alias>`

!> Default permission is **CASTERS**

### Parameters

- `<!alias>` - alias to be removed

### Examples

<blockquote>
  <strong>testuser:</strong>!alias remove !uec <br>
  <strong>bot:</strong> @testuser, alias !uec2 was removed
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !alias remove !ueca <br>
  <strong>bot:</strong> @testuser, alias !ueca was not found in database
</blockquote>

## List of aliases

`!alias list`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>testuser:</strong>!alias list <br>
  <strong>bot:</strong> @testuser, list of aliases: !uec
</blockquote>

## Enable or disable alias

`!alias toggle <!alias>`

!> Default permission is **CASTERS**

### Parameters

- `<!alias>` - alias to be enabled or disabled

### Examples

<blockquote>
  <strong>testuser:</strong>!alias toggle !uec <br>
  <strong>bot:</strong> @testuser, alias !uec was disabled
</blockquote>

<blockquote>
  <strong>testuser:</strong>!alias toggle !uec <br>
  <strong>bot:</strong> @testuser, alias !uec was enabled
</blockquote>

## Toggle visibility of alias in lists

`!alias toggle-visibility <!alias>`

!> Default permission is **OWNER**

### Parameters

- `<!alias>` - alias to be exposed or concealed

### Examples

<blockquote>
  <strong>testuser:</strong>!alias toggle !uec <br>
  <strong>bot:</strong> @testuser, alias !uec was concealed
</blockquote>

<blockquote>
  <strong>testuser:</strong>!alias toggle !uec <br>
  <strong>bot:</strong> @testuser, alias !uec was exposed
</blockquote>

## Other settings

### Enable or disable alias system

`!enable system alias` |
`!disable system alias`

!> Default permission is **OWNER**