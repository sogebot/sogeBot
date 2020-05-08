## Prerequisites

- **Browsers**: only latest Chrome/Chromium stable are supported
- **[Node.js](https://nodejs.org/en/)**: latest **current** or **LTS** version
- **RAM**: Minimum 512MB, Recommended 1024MB
- **HDD**: Minimum 500MB
- Twitch bot account

!> You need **separate** account for your bot, bot **won't** work on your
   broadcaster account

## Docker

### Docker prerequisites

- **Docker**, Any of the [supported repositories](http://sogehige.github.io/sogeBot/#/configuration/database)

### Instalation

!> If you want to use **SQLite**, be sure to use `./shared/sogebot.db` path to
   your db file, so you have an access outside of docker.

!> Note that **localhost** is accessing docker localhost. You need to use full
   IP address for your database connections.

1. Download `Docker Compose` files
    - From GIT: `git clone git@github.com:sogehige/sogeBot-docker.git`
    - Without GIT as [ZIP](https://github.com/sogehige/sogeBot-docker/archive/master.zip)
2. Configure properly .env file in `root` directory
    - You can find examples at [our GitHub repository](https://github.com/sogehige/sogeBot/tree/master/src/bot/data)
3. Download bot images with `docker compose`
    - Release version: `docker-compose pull`
    - Nightly version: `docker-compose -f docker-compose-nightly.yml pull`
4. Startup your bot (add -d if you want to detach process)
    - Release version: `docker-compose up`
    - Nightly version: `docker-compose -f docker-compose-nightly.yml up`

## From zipfile

### Installation

- Download latest release from [GitHub sogeBot release page](https://github.com/sogehige/sogeBot/releases)
- Set your [database environment](configuration/database)
- if you want to use `!title` and `!game` you need to add bot as channel editor
  in [Permissions settings](http://twitch.tv/dashboard/permissions) on Twitch
- before starting a bot, you need to install npm dependencies

    `npm ci`

- start bot

    `npm start`

- To access webpanel, go to `http://localhost:<port>` where port is configured
  as PORT env variable, e.g. `PORT=20001 npm start`

## From git

### Build prerequisites

- **Bash**, **Make**

### Installation (snapshot)

- Download [latest master zip](https://github.com/sogehige/sogeBot/archive/master.zip)
  or clone repository `git clone https://github.com/sogehige/sogeBot.git`
- Set your [database environment](configuration/database)
- if you want to use `!title` and `!game` you need to add bot as channel editor
  in [Permissions settings](http://twitch.tv/dashboard/permissions) on Twitch
- before starting a bot, you need to build a bot

    `make`

- start bot

    `npm start`

- To access webpanel, go to `http://localhost:<port>` where port is configured
  in config.json (default: 20000)

### NEDB

- run `node tools/database.js --from nedb`

### MongoDB

- run `node tools/database.js --from mongodb --mongoUri <your-mongouri>`

## Oauth generation

Generate your oauth tokens in `ui->settings->general->oauth` and paste your
`accessToken` and `refreshToken` from [Twitch Token Generator](https://twitchtokengenerator.com)
to your bot.

!> Make sure you login into correct accounts. Anonymous/Privacy modes can help
   you with login into correct accounts (Right click on generate button -> Open
  link in incognito window)
