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

    `docker rm sogebot; docker run -it --name <name-of-container> --env TOKEN=<token> --env MONGOURI=<mongouri> -p <port>:20000 sogebot:<version>`

- Change `<port>` to port on where bot should be served
- Change `<mongouri>` to your mongodb uri connection
- Change `<version>` to `latest` or release tag (e.g. `9.8.0`)
- Change `<name-of-container>` to set name of your container
- Change `<token>` to set your image specific token, if you want to random token, omit whole `--env TOKEN`

- If you serve bot on different than `localhost`, add `--env DOMAIN=<domain>` to
  enable bot UI on specific domain

- Example full command

    `docker run -it --name sogebot --env DOMAIN=my.publicdoma.in --env TOKEN=${cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1} --env MONGOURI=mongodb://localhost:27017/sogebot -p 80:20000 sogebot:9.8.0`

!> If you are using localhost mongodb, be sure that you can access mongodb server by HOST IP (e.g. 172.17.0.1).
   Example of error `(node:38) UnhandledPromiseRejectionWarning: MongoNetworkError: failed to connect to server [172.17.0.1:27017] on first connect [Error: connect ECONNREFUSED 172.17.0.1:27017`

!> If you are using dockerized mongodb, be sure to add `--bind_ip_all`
   to your mongodb docker container

   `docker run -it --hostname mongodb --name=mongodb --net=bridge --expose=27017 mongo --bind_ip_all`

## From zipfile

### Installation

- Download latest release from [GitHub sogeBot release page](https://github.com/sogehige/sogeBot/releases)
- Copy `config.example.json` to `config.json` and set everything as desired in `config` part
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
- if you want to use `!title` and `!game` you need to add bot as channel editor in [Permissions settings](http://twitch.tv/dashboard/permissions) on Twitch
- before starting a bot, you need to build a bot

    `make`

- start bot

    `npm start`

- To access webpanel, go to `http://localhost:<port>` where port is configured in config.json (default: 20000)

## Upgrade

- Backup your `config.json` and `db` folder, if you are using `nedb`
- unzip new sogeBot version
- copy your backup files/directories to a bot directory
- run **npm install** and you're ready!

## Oauth generation

Generate your oauth tokens in `ui->settings->general->oauth` and paste your
`accessToken` and `refreshToken` from https://twitchtokengenerator.com to your bot.

!> Make sure you login into correct accounts. Anonymous/Privacy modes can help
   you with login into correct accounts (Right click on generate button -> Open
  link in incognito window)