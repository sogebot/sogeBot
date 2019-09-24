!> Bets system will work only when Points system is enabled!

#### Commands | MODS
- !bet open [-timeout 2] -title "Your bet title" option | option | option | ...
    - open a new bet with selected options
    - timeout before bet lock in minutes, optional, default: 2
    - title must be in `""`
- !bet close [index]
    - close a bet and select option as winner
- !bet refund
    - close a bet and refund all participants

#### Commands | VIEWERS
- !bet
    - gets an info about bet
- !bet [index] [amount]
    - bet [amount] of points on [index]
