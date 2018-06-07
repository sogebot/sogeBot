## Install and Upgrade
### Installation
- Copy `config.example.json` to `config.json` and set everything as desired in `config` part
- Note: oauths needs to be in format `oauth:YourOauthCode`
- Its recommended to [create your own clientId](https://github.com/sogehige/sogeBot/wiki/custom-clientId-(recommended)) and use it in a bot
- if you want to use `!title` and `!game` you need to add bot as channel editor in http://twitch.tv/yourusername/dashboard/permissions
- before starting a bot, you need to install npm dependencies

    `npm install`

- start bot

    `npm start`

- To access webpanel, go to `http://localhost:<port>` where port is configured in config.ini (default: 20000)

### Upgrade
- Backup your `config.json` and `db` folder, if you are using `nedb`
- unzip new sogeBot version
- copy your backup files/directories to a bot directory
- run **npm install** and you're ready!