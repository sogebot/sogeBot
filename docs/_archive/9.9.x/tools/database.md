Migration between supported and deprecated databases.

!> Depending on how large your database is, it may take a while to process
!> You cannot move **from** and **to** same type of dbs

`node tools/database.js`

```bash
Usage: database.js --from <database> --to <database> --mongoUri <connectionUri>

Options:
  --version   Show version number                                      [boolean]
  --mongoUri  connectionUri of your mongodb instance
  -h, --help  Show help                                                [boolean]
  -f, --from  database from migrate                                   [required]
  -t, --to    database to migrate                                     [required]

  <database> can be nedb, mongodb

!!! WARNING: All data on --to <database> will be erased !!!

Missing required arguments: from, to
```

## Example
`node tools/database.js --from nedb --to mongodb --mongoUri mongodb://localhost:27017/dbmigration`

```bash
Info: Connecting to dbs
Info: Databases connections established
Process: custom.variables
Process: dashboards
Process: events
Process: systems.customcommands
Process: systems.polls
Process: systems.timers
Process: api.clips
Process: api.current
Process: api.max
Process: api.new
Process: bets.users
Process: cache
Process: cache.hosts
Process: cache.raids
Process: cache.titles
Process: cooldown.viewers
Process: core.api.games
Process: core.currency.settings
Process: core.oauth.settings
Process: core.tmi.settings
Process: core.users.settings
Process: custom.variables.history
Process: custom.variables.watch
Process: customTranslations
Process: customvars
Process: events.filters
Process: events.operations
Process: gambling.duel
Process: gambling.fightme
Process: games.duel.settings
Process: games.duel.users
Process: games.fightme.settings
Process: games.fightme.users
Process: games.gamble.settings
Process: games.heist
Process: games.heist.levels
Process: games.heist.results
Process: games.heist.settings
Process: games.heist.users
Process: games.roulette.settings
Process: games.seppuku.settings
Process: games.wheelOfFortune
Process: games.wheeloffortune.settings
Process: info
Process: integrations.donationalerts.settings
Process: integrations.phillipshue.settings
Process: integrations.spotify.settings
Process: integrations.streamlabs.settings
Process: integrations.twitter.settings
Process: overlays.alerts.settings
Process: overlays.bets.settings
Process: overlays.carousel
Process: overlays.carousel.settings
Process: overlays.clips.settings
Process: overlays.clipscarousel.settings
Process: overlays.credits.settings
Process: overlays.emotes.cache
Process: overlays.emotes.settings
Process: overlays.eventlist.settings
Process: overlays.gallery
Process: overlays.gallery.settings
Process: overlays.polls.settings
Process: overlays.stats.settings
Process: overlays.text
Process: overlays.text.settings
Process: overlays.wheeloffortune.settings
Process: permissions
Process: settings
Process: stats
Process: systems.alias
Process: systems.alias.settings
Process: systems.bets
Process: systems.bets.settings
Process: systems.bets.users
Process: systems.checklist
Process: systems.checklist.settings
Process: systems.commercial.settings
Process: systems.cooldown
Process: systems.cooldown.settings
Process: systems.cooldown.viewers
Process: systems.customcommands.count
Process: systems.customcommands.responses
Process: systems.customcommands.settings
Process: systems.highlights
Process: systems.highlights.settings
Process: systems.keywords
Process: systems.keywords.settings
Process: systems.moderation.messagecooldown
Process: systems.moderation.permits
Process: systems.moderation.settings
Process: systems.moderation.warnings
Process: systems.points.settings
Process: systems.polls.settings
Process: systems.polls.votes
Process: systems.price
Process: systems.price.settings
Process: systems.queue.settings
Process: systems.quotes
Process: systems.quotes.settings
Process: systems.raffles
Process: systems.raffles.participants
Process: systems.raffles.settings
Process: systems.ranks
Process: systems.ranks.settings
Process: systems.songs.ban
Process: systems.songs.playlist
Process: systems.songs.request
Process: systems.songs.settings
Process: systems.timers.responses
Process: systems.timers.settings
Process: systems.top.settings
Process: timersResponses
Process: users.bits
Process: users
Process: users.message
Process: users.messages
Process: users.online
Process: users.points
Process: users.tips
Process: users.watched
Process: widgets.customVariables
Process: widgets
Process: widgetsCmdBoard
Process: widgetsEventList
RemappingTable: custom.variables.watch
     Remapping: RTVKgpuGdZ8NVMka => 5c3e0ee445ee421410bf908e
     Remapping: lQKW3fe5wKOfsUG1 => 5c3e0ee445ee421410bf908c
     Remapping: nzOtvGdRiSu1HoOU => 5c3e0ee445ee421410bf908b
     Remapping: ec9AVxRxN1jZgByA => 5c3e0ee445ee421410bf908d
     Remapping: 0akvSC3cDV5j9djg => 5c3e0ee445ee421410bf908f
RemappingTable: custom.variables.history
     Remapping: RTVKgpuGdZ8NVMka => 5c3e0ee445ee421410bf908e
RemappingTable: widgets
     NotFound[dashboardId]: undefined
     Remapping: 0fLbO0xx3GmEUmUu => 5c3e0ee445ee421410bf9090
     NotFound[dashboardId]: undefined
     NotFound[dashboardId]: undefined
     Remapping: 0fLbO0xx3GmEUmUu => 5c3e0ee445ee421410bf9090
     NotFound[dashboardId]: undefined
     NotFound[dashboardId]: undefined
RemappingTable: events.filters
     Remapping: wvaslcOcV8t0dPKj => 5c3e0ee445ee421410bf9091
     Remapping: TecyOBSOsLRiV0RT => 5c3e0ee445ee421410bf9096
     Remapping: GleU4idjzoWtTzi8 => 5c3e0ee445ee421410bf9097
     Remapping: oG9Nm7I4u2yraCqR => 5c3e0ee445ee421410bf9092
     Remapping: UO7WrfVMikUS09n3 => 5c3e0ee445ee421410bf9095
     Remapping: aCllU15a51QnE17F => 5c3e0ee445ee421410bf9093
     Remapping: B0Bs8TZAPz2A8Xf0 => 5c3e0ee445ee421410bf9098
     Remapping: YqN7quqqzjF1U9uN => 5c3e0ee445ee421410bf9094
RemappingTable: events.operations
     Remapping: aCllU15a51QnE17F => 5c3e0ee445ee421410bf9093
     Remapping: B0Bs8TZAPz2A8Xf0 => 5c3e0ee445ee421410bf9098
     Remapping: TecyOBSOsLRiV0RT => 5c3e0ee445ee421410bf9096
     Remapping: YqN7quqqzjF1U9uN => 5c3e0ee445ee421410bf9094
     Remapping: oG9Nm7I4u2yraCqR => 5c3e0ee445ee421410bf9092
     Remapping: aCllU15a51QnE17F => 5c3e0ee445ee421410bf9093
     Remapping: wvaslcOcV8t0dPKj => 5c3e0ee445ee421410bf9091
     Remapping: oG9Nm7I4u2yraCqR => 5c3e0ee445ee421410bf9092
     Remapping: GleU4idjzoWtTzi8 => 5c3e0ee445ee421410bf9097
     Remapping: UO7WrfVMikUS09n3 => 5c3e0ee445ee421410bf9095
     Remapping: oG9Nm7I4u2yraCqR => 5c3e0ee445ee421410bf9092
RemappingTable: systems.customcommands.responses
     Remapping: mHYl2P05oWjjPsSN => 5c3e0ee445ee421410bf909a
     Remapping: fVM9xnxxR02KbZ7N => 5c3e0ee445ee421410bf909e
     Remapping: RBJjFgzbskkBC1BB => 5c3e0ee445ee421410bf90a0
     Remapping: lZEb5GSnlYb0AvCH => 5c3e0ee445ee421410bf909b
     Remapping: Pv5UHUEwdDkLHlt4 => 5c3e0ee445ee421410bf90a2
     Remapping: GB0cYNVAJD398fHM => 5c3e0ee445ee421410bf90a5
     NotFound[cid]: DByokElyXKK7m0Mr
     Remapping: fkclMgqWBfW1ErhP => 5c3e0ee445ee421410bf909d
     Remapping: QGo30GbAa0zOfZJb => 5c3e0ee445ee421410bf90a1
     Remapping: LkzWr3A7WOp9iJnb => 5c3e0ee445ee421410bf90a4
     Remapping: g8NTODzwrZsKnWYY => 5c3e0ee445ee421410bf909c
     Remapping: dVbUJr3KkYF49hwl => 5c3e0ee445ee421410bf909f
     Remapping: siBL4SBhjQceEvwF => 5c3e0ee445ee421410bf9099
     Remapping: MjhyDYDLg8mlgSoY => 5c3e0ee445ee421410bf90a3
     NotFound[cid]: oqliX1nsO83sjs5C
RemappingTable: systems.polls.votes
RemappingTable: systems.timers.responses
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: 0C33VLXW9MVhZMHX => 5c3e0ee445ee421410bf90a8
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: Eg4Xg6fkycDs4gfP => 5c3e0ee445ee421410bf90a7
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
     Remapping: hTCBQm2p6FrJYkSH => 5c3e0ee445ee421410bf90a6
Info: Completed
```