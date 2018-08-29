In a bot I am providing default clientId, which you can use.
Although if more users will use clientId, it may become errorneous.

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

### Possible errors
###### Sorry, the scope you are requesting is currently unavailable. Please contact integrationsuccess@twitch.tv for next steps.

!> For security reasons, Twitch is blocking `chat_login` scope.

According to this [twitch post](https://discuss.dev.twitch.tv/t/the-scope-you-are-requesting-is-currently-unavailable/17038/6),
Twitch is blocking `chat_login` scopes in freshly created apps. You need to send
email at integrationsuccess@twitch.tv to get your clientID whitelisted.