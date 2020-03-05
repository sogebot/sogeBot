## Start new scrim countdown

`!snipe (-c) <type:string> <minutes:number>`

!> Default permission is **OWNER**

### Parameters

- `-c`
  - *optional*
  - disables adding match IDs and Current Matches output
- `<type:string>`
  - set type of your scrim, e.g. duo, single, apex, etc. It's
    not enforced to specific values.
- `<minutes:number>`
  - minutes before start

### Examples

<blockquote>
  <strong>owner:</strong> !snipe duo 1 <br>
  <strong>bot:</strong> Snipe match (duo) starting in 1 minute <br>
  <strong>bot:</strong> Snipe match (duo) starting in 45 seconds <br>
  <strong>bot:</strong> Snipe match (duo) starting in 30 seconds <br>
  <strong>bot:</strong> Snipe match (duo) starting in 15 seconds <br>
  <strong>bot:</strong> Snipe match (duo) starting in 3. <br>
  <strong>bot:</strong> Snipe match (duo) starting in 2. <br>
  <strong>bot:</strong> Snipe match (duo) starting in 1. <br>
  <strong>bot:</strong> Starting now! Go! <br>
  <strong>bot:</strong> Please put your match ID in the chat
                        => !snipe match xxx <br>
  <strong>bot:</strong> Current Matches: &lt;empty&gt;
</blockquote>

## Stop countdown

`!snipe stop`

!> Default permission is **OWNER**

### Examples

<blockquote>
  <strong>owner:</strong> !snipe duo 1 <br>
  <strong>bot:</strong> Snipe match (duo) starting in 1 minute <br>
  <strong>bot:</strong> Snipe match (duo) starting in 45 seconds <br>
  <strong>owner:</strong> !snipe stop <br>
  <em><small>... no other messages ...</small></em>
</blockquote>

<blockquote style="border-left-color: #f66">
  <strong>testuser:</strong> !alias edit viewer !nonexisting !points <br>
  <strong>bot:</strong> @testuser, alias !nonexisting was not found in database
</blockquote>

## Add matchId to scrim

`!snipe match <matchId:string>`

!> Default permission is **VIEWERS**

### Parameters

- `<matchId:string>` - match ID of your match

### Examples

<blockquote>
  <strong>bot:</strong> Snipe match (duo) starting in 3. <br>
  <strong>bot:</strong> Snipe match (duo) starting in 2. <br>
  <strong>bot:</strong> Snipe match (duo) starting in 1. <br>
  <strong>bot:</strong> Starting now! Go! <br>
  <strong>bot:</strong> Please put your match ID in the chat
                        => !snipe match xxx <br>
  <strong>testuser:</strong>!snipe match 123-as-erq <br>
  <strong>testuser2:</strong>!snipe match 123-as-erq <br>
  <strong>testuser3:</strong>!snipe match 111-as-eee <br>
  <strong>bot:</strong> Current Matches: 123-as-erq - testuser, testuser2 |
                        111-as-eee - testuser3
</blockquote>
