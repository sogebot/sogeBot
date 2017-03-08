# SogeBot
[![Build Status](https://img.shields.io/travis/sogehige/SogeBot.svg?style=flat-square)](https://travis-ci.org/sogehige/SogeBot)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![nodejs](https://img.shields.io/badge/node.js-7.6.0-brightgreen.svg?style=flat-square)](https://nodejs.org/en/)
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
You can also contact me on my email sogehige@gmail.com or https://twitter.com/sogehige

| System           | Description                                                                                                        |
|------------------|--------------------------------------------------------------------------------------------------------------------|
| Alias            | Don't like default commands? Make an alias!                                                                        |
| Keywords         | Bot will respond on certain keywords                                                                               |
| Points / Loyalty | Points system for your users                                                                                       |
| Price            | Make viewers to spend points on e.g. !songrequest                                                                  |
| Ranks            | Create ranks for your viewers                                                                                      |
| Clips            | Clips posted in chat by your viewers will be saved and you can check them in webpanel                              |
| Custom commands  | Create (simplified) custom commands                                                                                |
| Notice           | Post a notice every x minutes                                                                                      |
| Queue            | Do you lost track of viewers who wants to play with you? Use !queue and be fair!                                   |
| Raffles          | Create raffles for you giveaways!                                                                                  |
| Songs            | **Songrequest** and **playlist** support for YouTube with **trimming** of videos and **auto volume normalization** |
| Cooldowns        | Stop spamming of commands with cooldowns!                                                                          |

| Game | Description                                    |
|------|------------------------------------------------|
| Bets |                                                |

#### Languages

* Cestina
* English

#### Other features

* custom bot name - you need twitch account for a bot
* basic channel auto moderation - links, symbols, long messages, capitals, spam, colors, emotes
* **clips** system to save clips posted in chat
* !uptime, !lastseen, !watched, !top, !game, !title commands
* set custom permissions for each command
* better logging -> know, why user is timed out, bot logs and exceptions
* **WebPanel**
* soundboard widget - place your mp3s to /public/dist/soundboard/ to customize
* change game and title from dashboard (your games and titles are saved to further use)

#### Prerequisites

* Node.js 7.x

#### Installation

* Latest release can be found at https://github.com/sogehige/SogeBot/releases
* Update config.ini - set bot username and password (oauth:xxxxxxxxxxxxxxxxxxxx), owners and channel
* **IF UPGRADING BOT AND USING OLD SogeBot.db**: npm install ; npm run migrate
* For **Linux**: run launch.sh
* For **Windows**: npm install ; node main.js

#### Command list
https://github.com/sogehige/SogeBot/wiki/Command-list

#### License

See LICENSE file

#### Special thanks

Special thanks goes to team behing tmi.js (you can check it on https://www.tmijs.org/). They did really awesome job.

#### Support [![Donate](https://img.shields.io/badge/paypal-donate-yellow.svg?style=flat-square)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9ZTX5DS2XB5EN)

If you want to support me, you can click a PayPal link above or you can contribute and we can create something great!
