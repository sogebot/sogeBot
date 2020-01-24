```config.json
{
  ...
  "panel": {
    "username": "set-your-login-username-here",
    "password": "set-your-login-password-here",
    "domain": "localhost",
    "port": 20000,
    "token": "set-your-unique-token-here"
  },
  ...
}
```

#### What is this?
Sets your webpanel access points and login information

#### Available values
###### username
- Sets your username to login into sogeBot panel
- *Example:* `Administrator`

###### password
- Sets your password to login into sogeBot panel
- *Example:* `Passw0rd`

###### domain
- From which domains should be your sogeBot panel accessible
- Can contain comma-separated multiple values
- *Example:* `localhost, mybot.mydomain.com, 12.13.14.15`

!> If you are accessing bot from different domain than is set, bot will return error page with directions how to enable domain you are currently accessing panel from.

###### port
- Port where bot will serve panel
- *Example:* `20000`

?> Bot is always served on localhost:<port>, for exposing bot on different domain or routing bot, use for example <a href="https://nginx.org/en/">NGINX</a>

###### token
- Unique security token, which is used to authorize external access on `ws`
- *Example:* `SomethingCompletelyRandom12`

?> You can generate your token at <a href="https://passwordsgenerator.net/">password generator</a>.
