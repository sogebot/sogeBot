?> To update your database, you need to set `ormconfig.json` properly, see
   [TypeORM Connection Options](https://typeorm.io/#/connection-options)
   for detailed information.

!> TypeORM is supporting various databases, below are listed **only** supported databases
   by sogeBot.

## Supported databases

- SQLite - **default**
- PostgreSQL 11.5
- MySQL 5.7
  - you need to set `character-set-server=utf8`
    and `collation-server=utf8_general_ci`