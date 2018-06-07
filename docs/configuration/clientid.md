In a bot I am providing default clientId, which you can use. Although if more users will use clientId, it may become errorneous.

### How to create own clientId
- go to https://dev.twitch.tv/dashboard/apps/ and login into your twitch account
- click on `register your application` button
- set your name of application - for example your bot name
- set `OAuth Redirect URI` to http://oauth.sogehige.tv
- click `register` button
- your `clientId` will be visible

### How to generate oauth
- go to http://oauth.sogehige.tv
- copy-paste your clientId from https://dev.twitch.tv/dashboard/apps/ into clientId input field
- continue as usual - best approach is to create oauth in new incognito windows