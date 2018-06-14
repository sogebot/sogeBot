!> Timezone is affecting only bot logs and `!time` command

```config.json
{
  ...
  "timezone": "system",
  ...
}
```

#### What is this?
Changes timezone settings for a bot. Useful if you are on machine, where you cannot change system timezone or
you have several bots for different streamers in different timezones.

#### Available values
- *system* - will set timezone defined by system
- other timezones can be found at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  - you are interested in TZ values on wiki:
    - Africa/Abidjan
    - Europe/Prague
    - America/Argentina/San_Luis

?> If timezone is not set in `config.json`, default value is *system*