!> Song system will serve songrequest list and playlist on specified port in config.ini! Please set your username and password in config.ini for ytplayer as well!

### Commands | OWNER
- !skipsong
- !bansong or !bansong [video-id]
    - will ban current song or song specified by id and timeout user requested song
- !unbansong [video-id]
- !playlist add [video-id|youtube-url]
    - add song to playlist
- !playlist remove [video-id]
- !playlist steal
- !playlist
    - bot will print usage of !price commands

### Commands | VIEWER
- !songrequest [video-id|youtube-url]
- !wrongsong
    - will cancel song requested by user
- !currentsong

### Settings
- !set songs_volume [number]
    - default: 25
    - will set global volume for all songs
- !set songs_duration [number]
    - default: 10
    - set maximum song length in minutes (only for songrequests)
- !set songs_shuffle true/false
    - default: false
    - if set on true, playlist will play in random order
- !set songs_playlist true/false
    - default: true
    - if set on true, playlist will play
- !set songs_songrequest true/false
    - default: true
    - if set on true, songrequests will play