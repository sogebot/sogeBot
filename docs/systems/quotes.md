##### Changelog
| Version | Description                           |
| --------|:--------------------------------------|
| 8.0.0   | First implementation of quotes system |


## Add a new quote
`!quote add -tags <tags> -quote <quote>`

!> Default permission is **OWNER**

### Parameters
- `-tags` - *optional string* - comma-separated tags
  - *default value:* general
- `-quote` - *string* - Your quote to save

### Examples

<blockquote>
  <strong>testuser:</strong> !quote -tags dota 2, funny -quote Sure I'll win! <br>
  <strong>bot:</strong> @testuser, quote 1 'Sure I'll win!' was added. (tags: dota 2, funny)
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote add -quote Sure I'll win! <br>
  <strong>bot:</strong> @testuser, quote 2 'Sure I'll win!' was added. (tags: general)
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote add -tags dota 2, funny <br>
  <strong>bot:</strong> @testuser, !quote add is not correct or missing -quote parameter
</blockquote>

## Remove a quote
`!quote remove -id <id>`

!> Default permission is **OWNER**

### Parameters
- `-id` - *number* - ID of quote you want to delete

### Examples

<blockquote>
  <strong>testuser:</strong> !quote remove -id 1 <br>
  <strong>bot:</strong> @testuser, quote 1 was deleted.
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote remove -id a <br>
  <strong>bot:</strong> @testuser, quote ID is missing or is not a number.
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote remove -id 999999 <br>
  <strong>bot:</strong> @testuser, quote 999999 was not found.
</blockquote>

## Show a quote by ID
`!quote -id <id>`

!> Default permission is **VIEWER**

### Parameters
- `-id` - *number* - ID of quote you want to show

### Examples

<blockquote>
  <strong>testuser:</strong> !quote -id 1 <br>
  <strong>bot:</strong> Quote 1 by testuser 'Sure I'll win!'
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote -id a <br>
  <strong>bot:</strong> @testuser, quote ID is not a number.
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote -id 999999 <br>
  <strong>bot:</strong> @testuser, quote 999999 was not found.
</blockquote>

## Show a random quote by tag
`!quote -tag <tag>`

!> Default permission is **VIEWER**

### Parameters
- `-tag` - *string* - tag, where to get random quote from

### Examples

<blockquote>
  <strong>testuser:</strong> !quote -tag dota 2 <br>
  <strong>bot:</strong> Quote 1 by testuser 'Sure I'll win!'
</blockquote>

<blockquote>
  <strong>testuser:</strong> !quote -tag nonexisting <br>
  <strong>bot:</strong> @testuser, no quotes with tag nonexisting was not found.
</blockquote>

## Set tags for an existing quote
`!quote set -tag <tag> -id <id>`

!> Default permission is **OWNER**

### Parameters
- `-tag` - *string* - tag, where to get random quote from
- `-id` - *number* - ID of quote you want to update

### Examples

<blockquote>
  <strong>testuser:</strong> !quote set -id 2 -tag new tag <br>
  <strong>bot:</strong> @testuser, quote 2 tags were set. (tags: new tag)
</blockquote>

## Other settings
### Enable or disable quote system
`!enable system quotes` |
`!disable system quotes`

!> Default permission is **OWNER**

### Set URL for !quote list
You need to set your `public URL` in UI `system->quotes`.
