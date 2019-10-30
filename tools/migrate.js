require('module-alias/register');

const _ = require('lodash');
const figlet = require('figlet');
const config = require('../config.json');
const fs = require('fs');
const uuidv4 = require('uuid/v4');

const dropFiles = [ 'settings', 'api.max', 'api.current', 'api.new', 'overlays.text', 'cache.hosts', 'cache.raids' ];

const { isMainThread } = require('../dest/cluster');

if (!isMainThread) {
  process.exit(0);
}

// db
const Database = require('../dest/databases/database');
global.db = new Database(false, true);

let interval = 0;

const header = function (message) {
  console.info(` # ${message}`);
  interval = setInterval(() => {
    console.info('.');
  }, 200);
};

const end = function (updated) {
  console.info(` OK (${updated} processed)`);
  clearInterval(interval);
};

const migration = {
  23: async () => {
    header('Add skipUrls to alerts with tts');
    let updated = 0;
    const alerts = await global.db.engine.find('registries.alerts');
    for (let i = 0; i < alerts.length; i++) {
      for (const event of Object.keys(alerts[i].alerts)) {
        for (const variant of alerts[i].alerts[event]) {
          variant.tts.skipUrls = true;
          updated++;
        }
      }
      delete alerts[i]._id;
      await global.db.engine.update('registries.alerts', { id: alerts[i].id }, alerts[i]);
      updated++;
    }
    end(updated);
  },
  22: async () => {
    header('Replace overlays.text with registries.text');
    let updated = 0;

    const items = await global.db.engine.find('overlays.text');
    for (const item of items) {
      delete item._id;
      await global.db.engine.insert('registries.text', item);
      updated++;
    }
    end(updated);
  },
  21: async () => {
    header('Add order for cmdboard widget');
    let updated = 0;

    const items = await global.db.engine.find('widgetsCmdBoard');
    for (const item of items) {
      await global.db.engine.update('widgetsCmdBoard', { _id: String(item._id) }, { order: updated });
      updated++;
    }
    end(updated);
  },
  20: async () => {
    header('Add id for carousel overlay');
    let updated = 0;

    const items = await global.db.engine.find('overlays.carousel');
    for (const item of items) {
      const id = uuidv4();
      await global.db.engine.update('overlays.carousel', { _id: String(item._id) }, { id });
      updated++;
    }
    end(updated);
  },
  19: async () => {
    header('Add id for ranks');
    let updated = 0;

    const items = await global.db.engine.find('systems.ranks');
    for (const item of items) {
      const id = uuidv4();

      await global.db.engine.update('systems.ranks', { _id: String(item._id) }, { id });
      updated++;
    }
    end(updated);
  },
  18: async () => {
    header('Add id for cooldown');
    let updated = 0;

    const items = await global.db.engine.find('systems.cooldown');
    for (const item of items) {
      const id = uuidv4();

      await global.db.engine.update('systems.cooldown', { _id: String(item._id) }, { id });
      updated++;
    }
    end(updated);
  },
  17: async () => {
    header('Add id for price');
    let updated = 0;

    const items = await global.db.engine.find('systems.price');
    for (const item of items) {
      const id = uuidv4();

      await global.db.engine.update('systems.price', { _id: String(item._id) }, { id });
      updated++;
    }
    end(updated);
  },
  16: async () => {
    header('Add keepAlertShown to alerts with tts');
    let updated = 0;
    const alerts = await global.db.engine.find('registries.alerts');
    for (let i = 0; i < alerts.length; i++) {
      for (const event of Object.keys(alerts[i].alerts)) {
        for (const variant of alerts[i].alerts[event]) {
          variant.tts.keepAlertShown = false;
          updated++;
        }
      }
      delete alerts[i]._id;
      await global.db.engine.update('registries.alerts', { id: alerts[i].id }, alerts[i]);
      updated++;
    }
    end(updated);
  },
  15: async () => {
    header('Add _amount, _currency to tips for faster ordering');
    let updated = 0;
    const rates = {
      AUD: '16.065', BRL: '5.893', BGN: '13.206', CNY: '3.344', DKK: '3.459', EUR: '25.830', PHP: '0.445', HKD: '2.947',
      HRK: '3.482', INR: '0.333', IDR: '0.002', ISK: '0.186', ILS: '6.363', JPY: '0.213', ZAR: '1.586',
      CAD: '17.109', KRW: '0.020', HUF: '0.080', MYR: '5.522', MXN: '1.168', XDR: '31.814', NOK: '2.642',
      NZD: '15.159', PLN: '6.030', RON: '5.452', RUB: '0.353', SGD: '16.852', SEK: '2.433', CHF: '23.140',
      THB: '0.735', TRY: '3.925', USD: '23.093', GBP: '29.147', CZK: '1',
    }

    const items = await global.db.engine.find('users.tips');
    for (const item of items) {
      const from = item.currency;
      const to = 'EUR';
      const amount = (item.amount * rates[from]) / rates[to];
      await global.db.engine.update('users.tips', { _id: String(item._id) }, { _currency: "EUR", _amount: amount });
      updated++;
    }
    end(updated);
  },
  14: async () => {
    header('Add id for alias');
    let updated = 0;

    const items = await global.db.engine.find('systems.alias');
    for (const item of items) {
      const id = uuidv4();

      await global.db.engine.update('systems.alias', { _id: String(item._id) }, { id });
      updated++;
    }
    end(updated);
  },
  13: async () => {
    header('Move alerts media to own collection');
    let updated = 0;
    const alerts = await global.db.engine.find('registries.alerts');
    for (let i = 0; i < alerts.length; i++) {
      for (const event of Object.keys(alerts[i].alerts)) {
        for (const variant of alerts[i].alerts[event]) {
          const imageId = uuidv4();
          const soundId = uuidv4();
          await global.db.engine.insert('registries.alerts.media', [
            { id: imageId, chunk: 0, b64data: variant.image },
            { id: soundId, chunk: 0, b64data: variant.sound },
          ])
          delete variant.image;
          delete variant.sound;
          variant.imageId = imageId;
          variant.soundId = soundId;
          updated++;
        }
      }
      await global.db.engine.remove('registries.alerts', { id: alerts[i].id });
      await global.db.engine.insert('registries.alerts', alerts[i]);
      updated++;
    }
    end(updated);
  },
  12: async () => {
    header('Add id for gallery');
    let updated = 0;

    const items = await global.db.engine.find('overlays.gallery');
    for (const item of items) {
      const id = uuidv4();
      const regex = new RegExp(String(item._id), 'g')

      await global.db.engine.update('overlays.gallery', { _id: String(item._id) }, { id });
      updated++;

      const responses = await global.db.engine.find('systems.customcommands.responses');
      for (const response of responses) {
        await global.db.engine.update('systems.customcommands.responses', { _id: String(response._id) }, {
          response: response.response.replace(regex, id)
        })
        updated++;
      }

      const aliases = await global.db.engine.find('systems.alias');
      for (const alias of aliases) {
        await global.db.engine.update('systems.alias', { _id: String(alias._id) }, {
          command: alias.command.replace(regex, id)
        })
        updated++;
      }

      const variables = await global.db.engine.find('custom.variables', { type: 'eval' });
      for (const variable of variables) {
        await global.db.engine.update('custom.variables', { _id: String(variable._id) }, {
          evalValue: variable.evalValue.replace(regex, id)
        })
        updated++;
      }
    }
    end(updated);
  },
  11: async () => {
    header('Add id for custom variables and update variableId(watch), cvarId(history)');
    let updated = 0;

    const commands = await global.db.engine.find('custom.variables');
    for (const command of commands) {
      const id = uuidv4();
      await global.db.engine.update('custom.variables', { _id: String(command._id) }, { id });
      updated++;

      const watch = await global.db.engine.find('custom.variables.watch', { variableId: String(command._id) });
      for (const w of watch) {
        updated++;
        await global.db.engine.update('custom.variables.watch', { _id: String(w._id) }, { variableId: id });
      }

      const history = await global.db.engine.find('custom.variables.history', { cvarId: String(command._id) });
      for (const h of history) {
        updated++;
        await global.db.engine.update('custom.variables.history', { _id: String(h._id) }, { cvarId: id });
      }
    }
    end(updated);
  },
  10: async () => {
    header('Add id for custom commands and update cid in responses');
    let updated = 0;

    const commands = await global.db.engine.find('systems.customcommands');
    for (const command of commands) {
      const id = uuidv4();
      await global.db.engine.update('systems.customcommands', { _id: String(command._id) }, { id });
      updated++;

      const responses = await global.db.engine.find('systems.customcommands.responses', { cid: String(command._id) });
      for (const response of responses) {
        updated++;
        await global.db.engine.update('systems.customcommands.responses', { _id: String(response._id) }, { cid: id });
      }
    }
    end(updated);
  },
  9: async () => {
    header('Add id for timers and update timerId in responses');
    let updated = 0;

    const timers = await global.db.engine.find('systems.timers');
    for (const timer of timers) {
      const id = uuidv4();
      await global.db.engine.update('systems.timers', { _id: String(timer._id) }, { id });
      updated++;

      const responses = await global.db.engine.find('systems.timer.responses', { timerId: String(timer._id) });
      for (const response of responses) {
        updated++;
        await global.db.engine.update('systems.timer.responses', { _id: String(response._id) }, { timerId: id });
      }
    }
    end(updated);
  },
  8: async () => {
    header('Add id for polls and update vid in votes');
    let updated = 0;

    const polls = await global.db.engine.find('systems.polls');
    for (const poll of polls) {
      const id = uuidv4();
      await global.db.engine.update('systems.polls', { _id: String(poll._id) }, { id });
      updated++;

      const votes = await global.db.engine.find('systems.polls.votes', { vid: String(poll._id) });
      for (const vote of votes) {
        updated++;
        await global.db.engine.update('systems.polls.votes', { _id: String(vote._id) }, { vid: id });
      }
    }
    end(updated);
  },
  7: async () => {
    header('Add id for dashboard and update dashboardId in widgets');
    let updated = 0;

    const dashboards = await global.db.engine.find('dashboards');
    for (const dashboard of dashboards) {
      const id = uuidv4();
      await global.db.engine.update('dashboards', { _id: String(dashboard._id) }, { id });
      updated++;

      const widgets = await global.db.engine.find('widgets', { dashboardId: String(dashboard._id) });
      for (const widget of widgets) {
        updated++;
        await global.db.engine.update('widgets', { _id: String(widget._id) }, { dashboardId: id });
      }
    }
    const mainWidgetsWith0String = await global.db.engine.find('widgets', { dashboardId: '0' });
    const mainWidgetsWith0Number = await global.db.engine.find('widgets', { dashboardId: 0 });
    for (const widget of [...mainWidgetsWith0Number, ...mainWidgetsWith0String]) {
      updated++;
      await global.db.engine.update('widgets', { _id: String(widget._id) }, { dashboardId: null });
    }
    end(updated);
  },
  6: async () => {
    header('Update quotes id to uuid');
    let updated = 0;

    const quotes = await global.db.engine.find('systems.quotes');
    for (const quote of quotes) {
      await global.db.engine.update('systems.quotes', { _id: String(quote._id) }, { id: uuidv4() });
      updated++;
    }
    end(updated);
  },
  5: async () => {
    header('Update quotes datetime to timestamp');
    let updated = 0;

    const quotes = await global.db.engine.find('systems.quotes');
    for (const quote of quotes) {
      await global.db.engine.update('systems.quotes', { _id: String(quote._id) }, { createdAt: new Date(quote.createdAt).getTime() });
      updated++;
    }
    end(updated);
  },
  4: async () => {
    header('Update moderation settings to __permission_based__');
    let updated = 0;

    const keys = [
      'cListsEnabled', 'cListsTimeout',
      'cLinksEnabled', 'cLinksIncludeSpaces', 'cLinksTimeout',
      'cSymbolsEnabled', 'cSymbolsTriggerLength', 'cSymbolsMaxSymbolsConsecutively', 'cSymbolsMaxSymbolsPercent', 'cSymbolsTimeout',
      'cLongMessageEnabled', 'cLongMessageTriggerLength', 'cLongMessageTimeout',
      'cCapsEnabled', 'cCapsTriggerLength', 'cCapsMaxCapsPercent', 'cCapsTimeout',
      'cSpamEnabled', 'cSpamTriggerLength', 'cSpamMaxLength', 'cSpamTimeout',
      'cColorEnabled', 'cColorTimeout',
      'cEmotesEnabled', 'cEmotesEmojisAreEmotes', 'cEmotesMaxCount', 'cEmotesTimeout',
    ];
    for (const key of keys) {
      const item = await global.db.engine.findOne('systems.settings', { key });
      if (typeof item.value !== 'undefined') {
        const value = {
          '0efd7b1c-e460-4167-8e06-8aaf2c170311': item.value,
          'c168a63b-aded-4a90-978f-ed357e95b0d2': null,
          'e8490e6e-81ea-400a-b93f-57f55aad8e31': null,
          'e3b557e7-c26a-433c-a183-e56c11003ab7': null,
          'b38c5adb-e912-47e3-937a-89fabd12393a': null,
          '4300ed23-dca0-4ed9-8014-f5f2f7af55a9': null,
        };
        await global.db.engine.remove('systems.settings', { key });
        await global.db.engine.insert('systems.settings',
          { key: '__permission_based__' + key, value });
      }
      updated++;
    }

    const keysToDelete = [
      'cLinksModerateSubscribers',
      'cSymbolsModerateSubscribers',
      'cLongMessageModerateSubscribers',
      'cCapsModerateSubscribers',
      'cSpamModerateSubscribers',
      'cColorModerateSubscribers',
      'cEmoteModerateSubscribers',
    ];
    for (const key of keysToDelete) {
      const item = await global.db.engine.findOne('systems.settings', { key });
      if (typeof item.value !== 'undefined') {
        await global.db.engine.remove('systems.settings', { key });
      }
      updated++;
    }
    end(updated);
  },
  3: async () => {
    header('Remove user.time.points');
    let updated = 0;
    for (const item of await global.db.engine.find('users')) {
      if (typeof _.get(item, 'time.points', undefined) !== 'undefined') {
        delete item.time.points;
        await global.db.engine.update('users', { _id: String(item._id) }, item);
        updated++;
      }
    }
    end(updated);
  },
  2: async () => {
    header('Add id to keywords');
    let updated = 0;
    for (const item of await global.db.engine.find('systems.keywords')) {
      if (typeof item.id === 'undefined') {
        item.id = uuidv4();
        await global.db.engine.update('systems.keywords', { _id: String(item._id) }, item);
        updated++;
      }
    }
    end(updated);
  },
  1: async () => {
    header('Updating points settings to permission based settings');
    let updated = 0;
    const permId = '0efd7b1c-e460-4167-8e06-8aaf2c170311';
    const list = [
      'interval',
      'perInterval',
      'offlineInterval',
      'perOfflineInterval',
      'messageInterval',
      'perMessageInterval',
      'messageOfflineInterval',
      'perMessageOfflineInterval',
    ];
    for (const key of list) {
      const item = await global.db.engine.findOne('systems.settings', { system: 'points', key });
      if (typeof item.value !== 'undefined') {
        await global.db.engine.update('systems.settings',
          { _id: String(item._id) },
          {
            key: `__permission_based__${key}`,
            value: JSON.stringify({
              [permId]: item.value,
            }),
          });
        updated++;
      }
    }
    end(updated);
  },
};

const runDeletion = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runDeletion(), 1000);
    return;
  }

  console.info(('-').repeat(56));
  if (config.database.type === 'nedb') {
    console.info('Removing nedb files');

    if (fs.existsSync('db/nedb/')) {
      for (const file of dropFiles) {
        if (fs.existsSync(`db/nedb/${file}.db`)) {
          console.info(`- Removing db/nedb/${file}.db`);
          fs.unlinkSync(`db/nedb/${file}.db`);
        }
      }
    } else {
      console.info('Nothing to do');
    }
    console.info(('-').repeat(56));
  } else if (config.database.type === 'mongodb') {
    console.info('Removing mongodb collections');
    const collections = await global.db.engine.collections();
    for (const file of dropFiles) {
      if (collections.includes(file)) {
        console.info(`- Removing ${file}`);
        await global.db.engine.drop(file);
      }
    }
  }
  process.exit();
};

const runMigration = async function () {
  if (!global.db.engine.connected) {
    setTimeout(() => runMigration(), 1000);
    return;
  }
  const info = await global.db.engine.find('info');
  const version = Object.keys(migration).sort((a,b) => a-b).reverse()[0];

  let dbVersion = _.isEmpty(info) || _.isNil(_.find(info, (o) => !_.isNil(o.version)).version)
    ? 0
    : _.find(info, (o) => !_.isNil(o.version)).version;

  if (isNaN(Number(dbVersion)) || dbVersion > 1000000) {
    dbVersion = 0;
  }

  if (version === dbVersion) {
    await runIndexing()
    process.exit();
  }

  console.log(figlet.textSync('MIGRATE', {
    font: 'ANSI Shadow',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  }));

  console.info(('-').repeat(56));
  console.info('Current bot version: %s', version);
  console.info('DB version: %s', dbVersion);
  console.info('DB engine: %s', config.database.type);
  console.info(('-').repeat(56));

  await updates(dbVersion, version);

  await runIndexing();

  console.info(('-').repeat(56));
  console.info('All process DONE! Database is upgraded to %s', version);
  await global.db.engine.remove('info', {});
  await global.db.engine.insert('info', { version: version });

  process.exit();
};

if (process.argv[2] && process.argv[2] === '--delete') {
  runDeletion();
} else {
  runMigration();
}

const updates = async (from, to) => {
  console.info('Performing update from %s to %s', from, to);
  console.info(('-').repeat(56));
  for (const key of Object.keys(migration).sort((a,b) => a-b )) {
    if (Number(key) > Number(from)) {
      await migration[key]();
    }
  }
};

const runIndexing = async() => {
  // indexing
  console.info(('-').repeat(56));
  console.log('Indexing dbs')
  await global.db.engine.index('cache', [{ index: 'key', unique: true }]);
  await global.db.engine.index('cache.titles', [{ index: 'game' }]);
  await global.db.engine.index('api.clips', [{ index: 'clipId', unique: true }]);
  await global.db.engine.index('core.api.tags', [{ index: 'tag_id', unique: true }]);
  await global.db.engine.index('core.api.currentTags', [{ index: 'tag_id', unique: true }]);
  await global.db.engine.index('core.api.games', [{ index: 'id', unique: true }]);
  await global.db.engine.index('custom.variables', [{ index: 'id', unique: true }, { index: 'variableName' }]);
  await global.db.engine.index('custom.variables.watch', [{ index: 'variableId' }]);
  await global.db.engine.index('custom.variables.history', [{ index: 'cvarId' }]);
  await global.db.engine.index('events', [{ index: 'id', unique: true }]);
  await global.db.engine.index('events.operations', [{ index: 'eventId' }]);
  await global.db.engine.index('events.filters', [{ index: 'eventId' }]);
  await global.db.engine.index('games.duel.users', [{ index: 'id', unique: true }]);
  await global.db.engine.index('games.fightme.users', [{ index: 'user' }]);
  await global.db.engine.index('games.heist', [{ index: 'key', unique: true }]);
  await global.db.engine.index('games.heist.users', [{ index: 'id', unique: true }]);
  await global.db.engine.index('users.chat', [{ index: 'id' }]);
  await global.db.engine.index('users.tips', [{ index: 'timestamp', unique: true }, { index: 'id' }]);
  await global.db.engine.index('users.bits', [{ index: 'timestamp', unique: true }, { index: 'id' }]);
  await global.db.engine.index('users.points', [{ index: 'id', unique: true }]);
  await global.db.engine.index('users.messages', [{ index: 'id', unique: true }]);
  await global.db.engine.index('users.watched', [{ index: 'id', unique: true }]);
  await global.db.engine.index('users.online', [{ index: 'username' }]);
  await global.db.engine.index('dashboards', [{ index: 'id', unique: true }]);
  await global.db.engine.index('widgets', [{ index: 'dashboardId' }]);
  await global.db.engine.index('widgetsCmdBoard', { index: 'command' });
  await global.db.engine.index('systems.timers', { index: 'id', unique: true });
  await global.db.engine.index('systems.timers.responses', { index: 'timerId' });
  await global.db.engine.index('systems.songs.ban', [{ index: 'videoId', unique: true }]);
  await global.db.engine.index('systems.songs.playlist', [{ index: 'videoID', unique: true }]);
  await global.db.engine.index('systems.songs.request', [{ index: 'videoID' }]);
  await global.db.engine.index('systems.ranks', [{ index: 'hours' }]);
  await global.db.engine.index('widgetsEventList', { index: 'timestamp' });
  await global.db.engine.index('systems.moderation.messagecooldown', [{ index: 'key', unique: true }]);
  await global.db.engine.index('systems.moderation.permits', [{ index: 'username' }]);
  await global.db.engine.index('systems.moderation.warnings', [{ index: 'username' }]);
  await global.db.engine.index('core.commands.count', [{ index: 'timestamp' }, { index: 'command' }]);
  await global.db.engine.index('games.wheeloffortune', [{ index: 'key', unique: true }]);
  await global.db.engine.index('overlays.emotes.cache', { index: 'code' });
  await global.db.engine.index('systems.raffles.participants', [{ index: 'raffle_id' }, { index: 'username' }]);
  await global.db.engine.index('overlays.gallery', { index: 'id', unique: true });
  await global.db.engine.index('overlays.goals.groups', { index: 'uid', unique: true });
  await global.db.engine.index('overlays.goals.goals', { index: 'uid', unique: true });
  await global.db.engine.index('core.permissions', [{ index: 'id', unique: true }]);
  await global.db.engine.index('core.permissions.commands', [{ index: 'key', unique: true }]);
  await global.db.engine.index('registries.alerts', [{ index: 'id', unique: true }]);
  await global.db.engine.index('registries.alerts.media', [{ index: 'id', unique: false }]);
  await global.db.engine.index('systems.alias', [{ index: 'alias' }, { index: 'id', unique: true }]);
  await global.db.engine.index('systems.cooldown', [{ index: 'key' }, { index: 'id', unique: true }]);
  await global.db.engine.index('systems.cooldown.viewers', [{ index: 'username' }]);
  await global.db.engine.index('systems.customcommands', { index: 'id', unique: true });
  await global.db.engine.index('systems.customcommands.count', [{ index: 'command', unique: true }]);
  await global.db.engine.index('systems.customcommands.responses', [{ index: 'cid' }]);
  await global.db.engine.index('systems.highlights', [{ index: 'id' }]);
  await global.db.engine.index('systems.howlongtobeat', [{ index: 'game', unique: true }]);
  await global.db.engine.index('systems.keywords', [{ index: 'id', unique: true }, { index: 'keyword' }]);
  await global.db.engine.index('systems.polls.votes', { index: 'vid' });
  await global.db.engine.index('systems.polls', [{ index: 'openedAt' }, { index: 'id', unique: true }]);
  await global.db.engine.index('systems.price', [{ index: 'command' }, { index: 'id', unique: true }]);
  await global.db.engine.index('systems.queue', [{ index: 'username' }]);
  await global.db.engine.index('systems.queue.picked', [{ index: 'username' }]);
  await global.db.engine.index('systems.quotes', [{ index: 'id', unique: true }]);
}