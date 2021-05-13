## Cooldowns system
`!cooldown <!command|keyword|g:group> <global|user> <seconds> <true|false>`

- **OWNER** - set cooldown for command or keyword (per user or global), true/false sets whisper message
- If your command have subcommand, use quote marks, e.g. `!cooldown '!test command' user 60 true`

`!cooldown unset <!command|keyword|g:group>` - **OWNER** - unset cooldown for command or keyword

`!cooldown toggle moderators <keyword|!command|g:group> <global|user>` - **OWNER** - enable/disable specified keyword or !command cooldown for moderators (by default disabled)

`!cooldown toggle owners <keyword|!command|g:group> <global|user>` - **OWNER** - enable/disable specified keyword or !command cooldown for owners  (by default disabled)

`!cooldown toggle subscribers <keyword|!command|g:group> <global|user>` - **OWNER** - enable/disable specified keyword or !command cooldown for subscribers (by default enabled)

`!cooldown toggle followers <keyword|!command|g:group> <global|user>` - **OWNER** - enable/disable specified keyword or !command cooldown for followers (by default enabled)

`!cooldown toggle enabled <keyword|!command|g:group> <global|user>` - **OWNER** - enable/disable specified keyword or !command cooldown