## Raffle system
### Commands
`!raffle pick` - **OWNER** - pick or repick a winner of raffle

`!raffle remove` - **OWNER** - remove raffle without winner

`!raffle open ![raffle-keyword] [-min #?] [-max #?] [-for subscribers?]`
- open a new raffle with selected keyword,
- -min # - minimal of tickets to join, -max # - max of tickets to join -> ticket raffle
- -for subscribers - who can join raffle, if empty -> everyone

`!raffle` - **VIEWER** - gets an info about raffle

`![raffle-keyword]` *or* `![raffle-keyword] <tickets>` - **VIEWER** - join a raffle *or* ticket raffle with amount of tickets