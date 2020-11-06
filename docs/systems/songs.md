## Enable / Disable song requests

`!set systems.songs.songrequest <true/false>`

!> Default permission is **CASTERS**

## Enable / Disable playing song from playlist

`!set systems.songs.playlist <true/false>`

!> Default permission is **CASTERS**

## Ban a song

`!bansong <optional-videoId>`

!> Default permission is **CASTERS**

### Parameters

- `<videoId>`
  - *optional YouTube videoID*
  - *default value:* current playing song

### Examples

<blockquote>
  <strong>testuser:</strong> !bansong <br>
  <strong>bot:</strong> @testuser, Song Unknown Brain & Kyle Reynolds - I'm Sorry
  Mom [NCS Release] was banned and will never play again! <br>
  <em>/ if user requested song, he will got timeout: You've got timeout for posting
  banned song /</em>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !bansong s0YJhnVEgMw<br>
  <strong>bot:</strong> @testuser, Song Rival - Lonely Way (ft. Caravn)
  [NCS Release] was banned and will never play again! <br>
  <em>/ if user requested song, he will got timeout: You've got timeout for posting
  banned song /</em>
</blockquote>

## Unban a song

`!unbansong <videoId>`

!> Default permission is **CASTERS**

### Parameters

- `<videoId>`
  - *YouTube videoID*

### Examples

<blockquote>
  <strong>testuser:</strong> !unbansong UtE7hYZo8Lo<br>
  <strong>bot:</strong> @testuser, This song was not banned.<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !unbansong s0YJhnVEgMw<br>
  <strong>bot:</strong> @testuser, Song was succesfully unbanned.<br>
</blockquote>

## Skip currently playing song

`!skipsong`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !skipsong<br>
  <em>/ no response from bot expected /</em></blockquote>
</blockquote>

## Show currently playing song

`!currentsong`

!> Default permission is **VIEWERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !currentsong<br>
  <strong>bot:</strong> testuser, No song is currently playing<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !currentsong<br>
  <strong>bot:</strong> testuser, Current song is Syn Cole - Time [NCS Release]
  from playlist<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !currentsong<br>
  <strong>bot:</strong> Current song is Rogers & Dean - Jungle [NCS Release]
  requested by testuser2<br>
</blockquote>

## Show current playlist

`!playlist`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist<br>
  <strong>bot:</strong> testuser, current playlist is general.<br>
</blockquote>

## List available playlist

`!playlist list`

!> Default permission is **CASTER**

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist list<br>
  <strong>bot:</strong> testuser, available playlists: general, chill, test.<br>
</blockquote>

## Add song from playlist

`!playlist add <video-id|video-url|search-string>`

!> Default permission is **CASTERS**

### Parameters

- `<video-id|video-url|search-string>`
  - use YouTube videoID, video URL or search string
  - Examples:
    - QnL5P0tFkwM
    - https://www.youtube.com/watch?v=QnL5P0tFkwM
    - http://youtu.be/QnL5P0tFkwM
    - Rogers & Dean - Jungle

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist add QnL5P0tFkwM<br>
  <strong>bot:</strong> testuser, song Rogers & Dean - Jungle [NCS Release]
 was added to playlist.<br>
</blockquote>

## Remove song from playlist

`!playlist remove <video-id>`

!> Default permission is **CASTERS**

### Parameters

- `<video-id>`
  - use YouTube videoID
  - Examples:
    - QnL5P0tFkwM

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist remove QnL5P0tFkwM<br>
  <strong>bot:</strong> testuser, song Rogers & Dean - Jungle [NCS Release]
 was removed from playlist.<br>
</blockquote>

## Import YouTube playlist into playlist

`!playlist import <playlist-link>`

!> Default permission is **CASTERS**

### Parameters

- `<playlist-link>`
  - use YouTube playlist link
  - Examples:
    - https://www.youtube.com/watch?list=PLGBuKfnErZlD_VXiQ8dkn6wdEYHbC3u0i

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist remove QnL5P0tFkwM<br>
  <strong>bot:</strong> testuser, song Rogers & Dean - Jungle [NCS Release]
 was removed from playlist.<br>
</blockquote>

## Steal current song to playlist

`!playlist steal`

!> Default permission is **CASTERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist steal<br>
  <strong>bot:</strong> testuser, No song is currently playing.<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !playlist steal<br>
  <strong>bot:</strong> testuser, song Max Brhon - Pain [NCS Release] was added
  to playlist. <br>
</blockquote>

## Change current playlist

`!playlist set <playlist>`

!> Default permission is **CASTERS**

### Parameters

- `<playlist>`
  - your desired playlist to play

### Examples

<blockquote>
  <strong>testuser:</strong> !playlist set general<br>
  <strong>bot:</strong> testuser, you changed playlist to general.<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !playlist set thisdoesntexist<br>
  <strong>bot:</strong> testuser, your requested playlist thisdoesntexist
  doesn't exist.<br>
</blockquote>

## Request song

`!songrequest <video-id|video-url|search-string>`

!> Default permission is **VIEWERS**

### Parameters

- `<video-id|video-url|search-string>`
  - use YouTube videoID, video URL or search string
  - Examples:
    - QnL5P0tFkwM
    - https://www.youtube.com/watch?v=QnL5P0tFkwM
    - http://youtu.be/QnL5P0tFkwM
    - Rogers & Dean - Jungle

### Examples

<blockquote>
  <strong>testuser:</strong> !songrequest QnL5P0tFkwM<br>
  <strong>bot:</strong> Sorry, testuser, song requests are disabled<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !songrequest QnL5P0tFkwM<br>
  <strong>bot:</strong> Sorry, testuser, but this song is banned<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !songrequest QnL5P0tFkwM<br>
  <strong>bot:</strong> Sorry, testuser, but this song is too long<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !songrequest QnL5P0tFkwM<br>
  <strong>bot:</strong> Sorry, testuser, but this song must be music category<br>
</blockquote>

<blockquote>
  <strong>testuser:</strong> !songrequest QnL5P0tFkwM<br>
  <strong>bot:</strong> testuser, song Rogers & Dean - Jungle [NCS Release]
  was added to queue<br>
</blockquote>

## User skip own requested song

`!wrongsong`

!> Default permission is **VIEWERS**

### Examples

<blockquote>
  <strong>testuser:</strong> !songrequest QnL5P0tFkwM<br>
  <strong>bot:</strong> testuser, song Rogers & Dean - Jungle [NCS Release]
  was added to queue<br>
  <strong>testuser:</strong> !wrongsong<br>
  <strong>bot:</strong> testuser, your song Rogers & Dean - Jungle [NCS Release]
  was removed from queue<br>
</blockquote>

## Other settings

### Enable or disable songs system

`!enable system songs` |
`!disable system songs`

!> Default permission is **OWNER**
