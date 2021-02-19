## Commands
`!permit <username> <count:optional:default:1>` - **MODS** - user will be able
to post a <count> of link without timeout

You can allow/forbide words in UI `settings->moderation`

## Allowing and forbidding words

### Available special characters

- asterisk -> `*` - zero or more chars
- plus -> `+` - one or more chars

#### Examples

- `test*`
  - `test` - ✓
  - `test1` - ✓
  - `testa` - ✓
  - `atest` - X
- `test+`
  - `test` - X
  - `test1` - ✓
  - `testa` - ✓
  - `atest` - X
- `test`
  - `test` - ✓
  - `test1` - X
  - `testa` - X
  - `atest` - X

## URL whitelisting

Use this pattern to whitelist your desired url. Change `example.com` to
what you want.

`(https?:\/\/)?(www\.)?example.com(*)?` or `domain:example.com`
