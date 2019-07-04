## NeDB

This is default db to use with a bot

```
  "database": {
    "__README__": "https://github.com/sogehige/sogeBot/wiki/Database-configuration",
    "type": "nedb"
  }
```


## MongoDB

To enable MongoDB in a bot, you need to change this lines in yourt config.json

```
  "database": {
    "__README__": "https://github.com/sogehige/sogeBot/wiki/Database-configuration",
    "type": "mongodb",
    "mongodb": {
      "url": "mongodb://url-to-mongodb-instance:27017/your-mongo-db"
    }
  }
```