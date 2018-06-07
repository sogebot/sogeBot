## Create your own twitter application
- go to: https://apps.twitter.com/
- click on create a new app
![](https://drive.google.com/uc?id=0B-_RLmmL4nXnR2dHTGhyNDZwMWs)
- set your information in a bot and don't forget to check Developer Agreement
![](https://drive.google.com/uc?id=0B-_RLmmL4nXnZkxTeWVfN3dTeFE)
- click on _Create your Twitter application_ button
- go to _Keys and Access Tokens_ tab
- generate your access tokens
![](https://drive.google.com/uc?id=0B-_RLmmL4nXnSUp2bDNOdHZRRk0)
- save consumer key, consumer secret, access token and access token secret

![](https://drive.google.com/uc?id=0B-_RLmmL4nXnLTdiblBQeU9DNWM)
![](https://drive.google.com/uc?id=0B-_RLmmL4nXnRTRYNnA3Rnhjek0)

## Bot configuration
- edit `config.ini`
- enable twitter integration
- set all your keys and tokens
```
[integration]
twitter = true

[twitter]
user = YourTwitterUserName
consumerKey = consumer_key_here
consumerSecret = secret_key_here
accessToken = access_token_here
secretToken = access_token_secret_here
```
- **restart a bot**
- event **post a twitter message** and twitter widget will become available