Bot can be started with various environment variables

## DISABLE

Force system to be disabled. Mainly used for moderation system

- `DISABLE=moderation`
- nothing is set *default*

## HEAP

Enables HEAP snapshot tracking and saving for a bot. In normal environment,
you **should not** enable this environment variable.

- `HEAP=true`
- `HEAP=false` *default*

Heaps are saved in `./heap/main` and `./heap/cluster` folders

## LOGLEVEL

Changes log level of a bot

- `LOGLEVEL=debug`
- `LOGLEVEL=info` *default*

## DEBUG

Enables extended debugging, by default its disabled

- `DEBUG=api.call` - will save `api.bot.csv` and `api.broadcaster.csv` files
- `DEBUG=webhooks.stream`, `DEBUG=api.stream`