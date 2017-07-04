# SogeBot
[![Discord](https://img.shields.io/discord/317348946144002050.svg?style=flat-square)](https://discordapp.com/invite/52KpmuH)
[![Build Status](https://img.shields.io/travis/sogehige/sogeBot.svg?style=flat-square)](https://travis-ci.org/sogehige/sogeBot)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![nodejs](https://img.shields.io/badge/node.js-8.0.0-brightgreen.svg?style=flat-square)](https://nodejs.org/en/)
[![GitHub release](https://img.shields.io/github/release/sogehige/sogebot.svg?style=flat-square)](https://github.com/sogehige/sogeBot/releases)
[![Downloads](https://img.shields.io/github/downloads/sogehige/sogebot/total.svg?style=flat-square)](https://github.com/sogehige/sogeBot/releases)
[![Donate](https://img.shields.io/badge/paypal-donate-yellow.svg?style=flat-square)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9ZTX5DS2XB5EN)

Free Twitch Bot built on Node.js

#### Screenshots
<img src="https://github.com/sogehige/SogeBot/blob/master/screenshots/1.png?raw=true" width="200">
<img src="https://github.com/sogehige/SogeBot/blob/master/screenshots/2.png?raw=true" width="200">
<img src="https://github.com/sogehige/SogeBot/blob/master/screenshots/3.png?raw=true" width="200">
<img src="https://github.com/sogehige/SogeBot/blob/master/screenshots/4.png?raw=true" width="200">
<img src="https://github.com/sogehige/SogeBot/blob/master/screenshots/5.png?raw=true" width="200">
<img src="https://github.com/sogehige/SogeBot/blob/master/screenshots/6.png?raw=true" width="200">

#### Issues
If you found an issue with a bot, feel free to create issue at https://github.com/sogehige/SogeBot/issues.
You can also contact me on my email sogehige@gmail.com or get support on our [discord server](https://discordapp.com/invite/52KpmuH).

| System             | Description                                                                                                                              |
|--------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Alias              | Don't like default commands? Make an alias!                                                                                              |
| Keywords           | Bot will respond on certain keywords                                                                                                     |
| Points / Loyalty   | Points system for your users                                                                                                             |
| Price              | Make viewers to spend points on e.g. !songrequest                                                                                        |
| Ranks              | Create ranks for your viewers                                                                                                            |
| Clips              | Clips posted in chat by your viewers will be saved and you can check them in webpanel                                                    |
| Custom commands    | Create custom commands, call custom APIs, set custom variables                                                                           |
| Notice             | Post a notice every x minutes                                                                                                            |
| Queue              | Do you lost track of viewers who wants to play with you? Use !queue and be fair!                                                         |
| Raffles            | Create raffles for you giveaways!                                                                                                        |
| Songs              | **Songrequest** and **playlist** support for YouTube with **trimming** of videos and **auto volume normalization**                       |
| Cooldowns          | Stop spamming of commands with cooldowns!                                                                                                |
| Permissions        | Set your custom permissions for your commands! (owner, mods, regular, viewer)                                                            |
| Moderation         | Automoderate links, colors, symbols, blacklist and more!                                                                                 |
| Twitch             | Be able to change your game and title from webpanel and much more! !uptime, !lastseen, etc.                                              |
| Webpanel and Stats | Bot is tracking your twitch **stats** and bot **webpanel** is user friendly and full of features!                                        |
|                    | Many widgets for your dashboard: customizable soundboard (/public/dist/soundboard/), follower list, twitch monitor, bets, songs and more |
|                    | Be able to set your !title and !game from dashboard and **save** them for further use!                                                   |
| Overlay            | Use various overlays in your OBS or XSplit                                                                                               |

| Game     | Description                                    |
|----------|------------------------------------------------|
| Bets     |                                                |
| Gambling | !seppuku, !roulette commands                   |
| Duel     | !duel - bet your points, only one can win      |

| Overlay       | Description                              |
|---------------|------------------------------------------|
| Emotes        | Show chat message emotes in your stream! |
| Stats         | Show viewers, follower, uptime           |
| ImageCarousel | Simple image fadeIn/fadeOut carousel     |
| Alerts        | Show images and play audio in overlay    |

#### Languages

* Cestina
* English

#### Prerequisites

* Node.js 8.x
* Minimum of 512MB RAM

#### Installation

* Latest release can be found at https://github.com/sogehige/SogeBot/releases
* Update config.ini - set bot username and password (oauth:xxxxxxxxxxxxxxxxxxxx), owners and channel
* `cd to/your/bot/folder`
* **IF UPGRADING BOT AND USING OLD SogeBot.db**: `rm -rf node_modules ; npm install`
* Check https://github.com/sogehige/SogeBot/releases for info, if you should do `npm migrate`
* For **Linux**: `npm install ; npm start`
* For **Windows**: `npm install ; npm start`

#### Command list
https://github.com/sogehige/SogeBot/wiki/Command-list

#### FAQ
https://github.com/sogehige/SogeBot/wiki/FAQ

#### License

See LICENSE file

#### Special thanks

Special thanks goes to team behing tmi.js (you can check it on https://www.tmijs.org/). They did really awesome job.

#### Support [![Donate](https://img.shields.io/badge/paypal-donate-yellow.svg?style=flat-square)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9ZTX5DS2XB5EN)

If you want to support me, you can click a PayPal link above or you can contribute and we can create something great!
