!> TypeORM is supporting various databases, below are listed **only** supported databases
   by sogeBot.

!> Update **!!! ONLY !!!** your connection informations

## How to configure your database

1. Select from your supported database and pick proper ormconfig.json
   from root folder
2. Update your connection options, see
   [TypeORM Connection Options](https://typeorm.io/#/connection-options)
   for detailed information.
3. **DON'T UPDATE ANY OTHER INFORMATIONS (LIKE MIGRATION, ENTITIES),
   OTHERWISE DATABASE WON'T WORK**
4. ???
5. Working bot

## Supported databases

- SQLite(**default**)
- PostgreSQL 11.5
- MySQL 5.7
  - you need to set `character-set-server=utf8`
    and `collation-server=utf8_general_ci`