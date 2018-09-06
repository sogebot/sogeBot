Migration from NeDB to MongoDB can be done through nedb-to-mongodb tool

!> Depending on how large your NeDB is, it may take a while to process

`node tools/nedb-to-mongodb.js`

```
Usage: nedb-to-mongodb.js --uri <connectionUri>

Options:
  --version               Show version number                          [boolean]
  --uri, --connectionUri  connectionUri of your mongodb instance      [required]
  -h, --help              Show help                                    [boolean]

Missing required argument: uri
```

## Example
`node tools/nedb-to-mongodb.js --uri 'mongodb://localhost:27017/myawesomedb'`

```
Processing api.clips
Processing bannedsong
Processing bets.users
Processing cache.raids
Processing cache.when
Processing api.new
Processing api.current
Processing api.max
Processing cache
Processing cache.users
Processing cooldown.viewers
Processing cache.hosts
Processing custom.variables.watch
Processing custom.variables
Processing games.duel.users
Processing games.gamble.settings
Processing customTranslations
Processing games.duel.settings
Processing games.fightme.settings
Processing events
Processing events.filters
Processing games.heist.settings
Processing games.fightme.users
Processing cache.game
Processing games.heist.users
Processing integrations.donationalerts
Processing cache.status
Processing gambling.duel
Processing customvars
Processing games.roulette.settings
Processing overlay.carousel
Processing gambling.fightme
Processing cache.titles
Processing events.operations
Processing games.wheeloffortune.settings
Processing settings
Processing games.heist.results
Processing integrations.spotify
Processing systems.bets
Processing permissions
Processing games.wheelOfFortune
Processing systems.cooldown
Processing systems.alias
Processing systems.bets.users
Processing systems.bets.settings
Processing systems.cooldown.viewers
Processing systems.keywords
Processing systems.alias.settings
Processing systems.customcommands
Processing integrations.streamlabs
Processing info
Processing overlay.credits.customTexts
Processing systems.keywords.settings
Processing systems.customcommands.settings
Processing systems.moderation.messagecooldown
Processing overlay.credits.socials
Processing systems.highlights.settings
Processing systems.moderation.warnings
Processing systems.queue.picked
Processing systems.moderation.settings
Processing systems.moderation.permits
Processing games.heist
Processing systems.queue.settings
Processing systems.points.settings
Processing systems.commercial.settings
Processing systems.raffles
Processing systems.quotes
Processing systems.queue
Processing systems.timers.responses
Processing systems.price.settings
Processing games.heist.levels
Processing systems.ranks.settings
Processing systems.quotes.settings
Processing systems.cooldown.settings
Processing systems.songs.systems.songs.playlist
Processing systems.ranks
Processing users.message
Processing systems.timers
Processing games.seppuku.settings
Processing systems.highlights
Processing systems.songs.settings
Processing users.online
Processing highlights
Processing systems.timers.settings
Processing systems.songs
Processing systems.raffles.participants
Processing timersResponses
Processing widgetsEventList
Processing users_ignorelist
Processing systems.raffles.settings
Processing systems.price
Processing users.tips
Processing users.bits
Processing widgets
Processing notices
Processing widgetsCmdBoard
Processing widgets.customVariables
Processing systems.songs.ban
Processing systems.songs.request
Processing stats
Processing systems.songs.playlist
Processing users.messages
Processing users.points
Processing users
Processing users.watched
Migration complete
```