!> If you **don't want'** to send metrics of your bot, set all metrics options
   to false

## Translations

Translations metrics are **enabled** by default. This metrics are helping to
find dead and non used translations in `locale` folder.

### What is translations metrics sending

- Version of bot
- Key of translation
- Count of usage of key

```json
{ version: '8.0.0',
  items:
    [
      { key: 'some.translation', count: 5 },
      { key: 'some.translation.second', count: 1 }
    ]
}
```

### Configuration

```config.json
  "metrics": {
    "translations": true
  }
```