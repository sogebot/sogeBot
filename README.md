# SogeBot
[![Build Status](https://img.shields.io/travis/sogehige/SogeBot.svg?style=flat-square)](https://travis-ci.org/sogehige/SogeBot)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)
[![nodejs](https://img.shields.io/badge/node.js-6.2.0-brightgreen.svg?style=flat-square)](https://nodejs.org/en/)
[![Donate](https://img.shields.io/badge/paypal-donate-yellow.svg?style=flat-square)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=9ZTX5DS2XB5EN)

Minimal CPU usage and small footprint twitch bot based on Node.js intended to be used on Raspberry PI.

*Notice: SogeBot is still in heavy alpha development*

#### Issues
If you found an issue with a bot, feel free to create issue at https://github.com/sogehige/SogeBot/issues.
You can also contact me on my email sogehige@gmail.com or https://twitter.com/sogehige

#### Current features

* custom bot name - you need twitch account for a bot
* basic channel auto moderation
* alias system
* basic custom command support
* keywords system
* notice system
* price and points system
* rank system
* !uptime, !lastseen, !watched commands
* !enable, !disable commands
* language support - currently english and cestina
* currently added **games**: bets
* better logging -> know, why user is timed out, bot logs and exceptions
* songs system - **songrequest** and **playlist** support for YouTube
* **auto volume normalization** of videos played through songs system
* **trimming** music videos in playlist
* _more to come_

#### Prerequisites

* Node.js 6.x

#### Instalation

* As there is no release yet, you need to clone repository https://github.com/sogehige/SogeBot.git
* Update config.ini - set bot username and password (oauth:xxxxxxxxxxxxxxxxxxxx)
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
