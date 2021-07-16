Bot can be started with various environment variables

## DISABLE

Force system to be disabled. Mainly used for moderation system

- `DISABLE=moderation`
- nothing is set *default*

## PORT

Set port for listening of UI.

- `PORT=12345`
- `PORT=20000` *default*

## SECUREPORT

Set port for listening of UI.

- `SECUREPORT=12345`
- `SECUREPORT=20443` *default*

## CA_KEY, CA_CERT

Sets your certificate and certificate key by **full path**

- `CA_KEY=/path/to/your/cert.key`
- `CA_CERT=/path/to/your/cert.cert`

## HEAP

Enables HEAP snapshot tracking and saving for a bot. In normal environment,
you **should not** enable this environment variable.

- `HEAP=true`
- `HEAP=false` *default*

Heaps are saved in `./heap/` folder

## LOGLEVEL

Changes log level of a bot

- `LOGLEVEL=debug`
- `LOGLEVEL=info` *default*

## DEBUG

Enables extended debugging, by default its disabled

- `DEBUG=api.call` - will save `api.bot.csv` and `api.broadcaster.csv` files
- `DEBUG=api.stream`

## THREAD

Force worker_threads to be disabled in special cases (e.g. getChannelChattersUnofficialAPI)

- `THREAD=0`
- nothing is set *default*

## TIMEZONE

!> Timezone is affecting only bot logs and `!time` command

## CORS

Enable socket.io cors settings

- `CORS=*`
- nothing is set *default*

### What is this?

Changes timezone settings for a bot. Useful if you are on machine, where you
cannot change system timezone or you have several bots for different streamers
in different timezones.

### Available values

- *system* - will set timezone defined by system
- other timezones can be found at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  - you are interested in TZ values on wiki:
    - Africa/Abidjan
    - Europe/Prague
    - America/Argentina/San_Luis

### Examples

- `TIMEZONE=system`
- `TIMEZONE=Europe/Prague`
- `TIMEZONE=America/Argentina/San_Luis`

?> If timezone is not set default value is *system*
