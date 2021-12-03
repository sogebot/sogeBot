**Question:** Does a bot support more than one channel?

**Answer:** Bot supports **only** one channel to be connected, there is longterm plan to add multichannel support, but currently one bot instance = one channel

***

**Question:** Can you add this super new feature to a bot?

**Answer:** Please [create new issue/feature request](https://github.com/sogebot/sogeBot/issues/new?labels=feature+request) and I'll look at it!

***

**Question:** Why !title and !game commands doesn't work?

**Answer:** Bot need channel editor permissions in http://twitch.tv/yourusername/dashboard/permissions and bot oauth token must be generated through http://oauth.sogebot.xyz/

***

**Question:** How can I run bot on boot/startup?

**Answer:** You can use [pm2](https://github.com/Unitech/pm2) to manage your bot instance and have it started on boot

***

**Question:** Why is bot not sending whisper messages?

**Answer:** Please read https://discuss.dev.twitch.tv/t/have-a-chat-whisper-bot-let-us-know/10651 and register your bot in application form. To get your bot user_id use curl command below.

    curl -H 'Accept: application/vnd.twitchtv.v5+json' \
    -H 'Client-ID: 1wjn1i3792t71tl90fmyvd0zl6ri2vg' \
    -X GET https://api.twitch.tv/kraken/users?login=<yourbotusername>

***

**Question:** Bot on docker have issues with connection to twitch or streamlabs (Error: getaddrinfo EAI_AGAIN)?

**Answer:** Check https://development.robinwinslow.uk/2016/06/23/fix-docker-networking-dns/ for steps to fix your issue

***
