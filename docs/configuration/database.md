!> TypeORM is supporting various databases, below are listed **only** supported databases
   by sogeBot.

!> Update **!!! ONLY !!!** your connection informations

## SQLite3

?> SQLite is **default** db (if installed by zipfile), if you didn't set MySQL/MariaDB or PostgreSQL,
you don't need to do anything

1. Rename `/path/to/sogebot/.env.sqlite` or in case of GIT install `/path/to/sogebot/src/data/.env.sqlite` to `/path/to/sogebot/.env`
2. **DON'T UPDATE ANY OTHER INFORMATIONS (LIKE MIGRATION, ENTITIES),
   OTHERWISE DATABASE WON'T WORK**
3. Start bot

## MySQL/MariaDB

1. Rename `/path/to/sogebot/.env.mysql` or in case of GIT install `/path/to/sogebot/src/data/.env.mysql` to `/path/to/sogebot/.env`
2. Update your connection options, see
   [TypeORM Connection Options](https://typeorm.io/#/connection-options)
   for detailed information.
3. **DON'T UPDATE ANY OTHER INFORMATIONS (LIKE MIGRATION, ENTITIES),
   OTHERWISE DATABASE WON'T WORK**
4. Start bot

## PostgreSQL

1. Rename `/path/to/sogebot/.env.postgres` or in case of GIT install `/path/to/sogebot/src/data/.env.postgres` to `/path/to/sogebot/.env`
2. Update your connection options, see
   [TypeORM Connection Options](https://typeorm.io/#/connection-options)
   for detailed information.
3. **DON'T UPDATE ANY OTHER INFORMATIONS (LIKE MIGRATION, ENTITIES),
   OTHERWISE DATABASE WON'T WORK**
4. Start bot

## Supported databases

- SQLite3(**default**)
- PostgreSQL 15
- MySQL 5.7
  - you need to set `character-set-server=utf8mb4`
    and `collation-server=utf8mb4_general_ci`
