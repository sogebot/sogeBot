## Prerequisites

- **Browsers**: only latest Chrome/Chromium stable are supported
- **[Node.js](https://nodejs.org/en/)**: latest **current** or **LTS** version
- **RAM**: Minimum 512MB, Recommended 1024MB
- **HDD**: Minimum 500MB
- Twitch bot account

!> You need **separate** account for your bot, bot **won't**  work on your broadcaster account

## Docker

### Docker prerequisites

- **Docker**, **MongoDB**

### Instalation

!> Only mongodb is currently available for docker installation

- Startup docker with sogebot

``` bash
docker run -it --name <name-of-container> \
--env MONGOURI=<mongouri> \
-p <port>:20000 \
<image>
```

- Change `<image>` to one of these
  - Unstable latest nightly: `docker.pkg.github.com/sogehige/sogebot/nightly`
  - Latest release: `docker.pkg.github.com/sogehige/sogebot/release`
  - Specific release of bot (e.g. 9.8.0): `docker.pkg.github.com/sogehige/sogebot/release:9.8.0`
- Change `<port>` to port on where bot should be served
- Change `<mongouri>` to your mongodb uri connection
- Change `<version>` to `latest` or release tag (e.g. `9.8.0`)
- Change `<name-of-container>` to set name of your container

- Example full command

!> When using non-specific image for latest version, use `docker pull <image>` to update your local image

``` bash
docker run -it --name sogebot \
--env MONGOURI=mongodb://localhost:27017/sogebot \
-p 80:20000 docker.pkg.github.com/sogehige/sogebot/release:9.8.0
```

!> If you are using localhost mongodb, be sure that you can access mongodb server by HOST IP (e.g. 172.17.0.1).
   Example of error `(node:38) UnhandledPromiseRejectionWarning: MongoNetworkError: failed to connect to server [172.17.0.1:27017] on first connect [Error: connect ECONNREFUSED 172.17.0.1:27017`

!> If you are using dockerized mongodb, be sure to add `--bind_ip_all`
   to your mongodb docker container

``` bash
docker run -it --hostname mongodb --name=mongodb --net=bridge --expose=27017 mongo --bind_ip_all
```

## From zipfile

### Installation

- Download latest release from [GitHub sogeBot release page](https://github.com/sogehige/sogeBot/releases)
- Copy `config.example.json` to `config.json` and set everything as desired in `config` part
- Set your [ormconfig.json](configuration/database)
- if you want to use `!title` and `!game` you need to add bot as channel editor in [Permissions settings](http://twitch.tv/dashboard/permissions) on Twitch
- before starting a bot, you need to install npm dependencies

    `npm install`

- start bot

    `npm start`

- To access webpanel, go to `http://localhost:<port>` where port is configured in config.json (default: 20000)

## From git

### Build prerequisites

- **Bash**, **Make**

### Installation (snapshot)

- Download [latest master zip](https://github.com/sogehige/sogeBot/archive/master.zip)
  or clone repository `git clone https://github.com/sogehige/sogeBot.git`
- Copy `config.example.json` to `config.json` and set everything as desired in `config` part
- Set your [ormconfig.json](configuration/database)
- if you want to use `!title` and `!game` you need to add bot as channel editor in [Permissions settings](http://twitch.tv/dashboard/permissions) on Twitch
- before starting a bot, you need to build a bot

    `make`

- start bot

    `npm start`

- To access webpanel, go to `http://localhost:<port>` where port is configured in config.json (default: 20000)

!> Upgrade from versions below 9.10x is **NOT SUPPORTED**

## Upgrade from **9.10.x**

- run **npm install**
- Backup your current database
- Set your [ormconfig.json](configuration/database)
- Migrate your database files to new system

### NEDB

- run `node tools/database.js --from nedb`

### MongoDB

- run `node tools/database.js --from mongodb --mongoUri <your-mongouri>`

## Upgrade after **9.10.x**

- unzip new sogeBot version
- copy your ormconfig.json and config.json into your new bot directory
- run **npm install** and you're ready!

## Oauth generation

Generate your oauth tokens in `ui->settings->general->oauth` and paste your
`accessToken` and `refreshToken` from https://twitchtokengenerator.com to your bot.

!> Make sure you login into correct accounts. Anonymous/Privacy modes can help
   you with login into correct accounts (Right click on generate button -> Open
  link in incognito window)