Current integration is enabling `$spotifySong` and song requests(PREMIUM) from Spotify

!> Spotify WEB Api is often bugged. Although bot offer functionality to skip,
   request songs, there *may* be issues with connection to spotify. Which is on spotify
   side.

## How to setup

1. Go to <https://beta.developer.spotify.com/dashboard/>
2. Log In into your account
3. Create your application

   ![1](../_images/spotify/1.png ':size=300')
   ![2](../_images/spotify/2.png ':size=300')

4. As your app is in development mode, you need to add user to this app

   ![3](../_images/spotify/3.png ':size=300')
   ![4](../_images/spotify/4.png ':size=300')
   ![5](../_images/spotify/5.png ':size=300')
   ![6](../_images/spotify/6.png ':size=300')

4. Add Client ID and Client Secret to a bot

   ![7](../_images/spotify/7.png ':size=300')

5. Add Redirect URI to Spotify and a Bot - redirect URI is where you access a bot.
   By default `http://localhost:20000/credentials/oauth/spotify` |
   **DON'T FORGET TO SAVE ON SPOTIFY**

   ![8](../_images/spotify/8.png ':size=300')
   ![9](../_images/spotify/9.png ':size=300')

6. Enable integration in a bot
7. Authorize user in a bot

   ![10](../_images/spotify/10.png ':size=300')

8. Done, user is authorized

## Request song through !spotify command - PREMIUM users only

`!spotify <spotifyURI>` or `!spotify <string>` or `!spotify <song link>`

!> Default permission is **DISABLED**

### Parameters

- `<spotifyURI>` -  spotify URI of a song you want to play, e.g. `spotify:track:14Vp3NpYyRP3cTu8XkubfS`
- `<string>` - song to search on spotify (will pick first found item), e.g.
  `lion king`
- `<song link>` - song link, e.g.
  `https://open.spotify.com/track/14Vp3NpYyRP3cTu8XkubfS?si=7vJWxZJdRu2VsBdvcVdAuA`

### Examples

<blockquote>
  <strong>testuser:</strong> !spotify spotify:track:0GrhBz0am9KFJ20MN9o6Lp <br>
  <strong>bot:</strong> @testuser, you requested song
  Circle of Life - 『ライオン・キング』より from Carmen Twillie
</blockquote>

<blockquote>
  <strong>testuser:</strong> !spotify lion king circle of life <br>
  <strong>bot:</strong> @testuser, you requested song
  Circle of Life - 『ライオン・キング』より from Carmen Twillie
</blockquote>

## Ban current song through !spotify ban command

`!spotify ban`

!> Default permission is **DISABLED**

### Examples

<blockquote>
  <strong>testuser:</strong> !spotify ban<br>
  <strong>bot:</strong> @testuser, song
  Circle of Life - 『ライオン・キング』より from Carmen Twillie was banned.
</blockquote>

## Unban song through !spotify unban command

`!spotify unban <spotifyURI>` or `!spotify unban <song link>`

!> Default permission is **DISABLED**

### Parameters

- `<spotifyURI>` -  spotify URI of a song you want to unban, e.g. `spotify:track:14Vp3NpYyRP3cTu8XkubfS`
- `<song link>` - song link, e.g.
  `https://open.spotify.com/track/14Vp3NpYyRP3cTu8XkubfS?si=7vJWxZJdRu2VsBdvcVdAuA`

### Examples

<blockquote>
  <strong>testuser:</strong> !spotify unban spotify:track:0GrhBz0am9KFJ20MN9o6Lp<br>
  <strong>bot:</strong> @testuser, song
  Circle of Life - 『ライオン・キング』より from Carmen Twillie was unbanned.
</blockquote>

## Song history with !spotify history command

`!spotify history` or `!spotify history <numOfSongs>`

!> Default permission is **VIEWERS**

### Parameters

- `<numOfSongs>` - how many of songs should be returned in history command, if
  omitted, it will show only last song, maximum 10.

### Examples

<blockquote>
  <strong>testuser:</strong> !spotify history<br>
  <strong>bot:</strong> @testuser, previous song was
  Circle of Life - 『ライオン・キング』より from Carmen Twillie.
</blockquote>


<blockquote>
  <strong>testuser:</strong> !spotify history 2<br>
  <strong>bot:</strong> @testuser, 2 previous songs were:<br>
  <strong>bot:</strong> 1 - Circle of Life - 『ライオン・キング』より from Carmen Twillie<br>
  <strong>bot:</strong> 2 - The Wolven Storm (Priscilla's Song) from Alina Gingertail.
</blockquote>
