'use strict';
require('module-alias/register');

const fs = require('fs');

const availableDbs = ['nedb', 'mongodb'];

const { createConnection, getConnection, getConnectionOptions, getManager, getRepository } = require('typeorm');
const { Alias } = require('../dest/entity/alias');
const { Commands, CommandsCount } = require('../dest/entity/commands');
const { Cooldown } = require('../dest/entity/cooldown');
const { CacheTitles } = require('../dest/entity/cacheTitles');
const { Highlight } = require('../dest/entity/highlight');
const { HowLongToBeatGame } = require('../dest/entity/howLongToBeatGame');
const { Keyword } = require('../dest/entity/keyword');
const { Settings } = require('../dest/entity/settings');
const { EventList } = require('../dest/entity/eventList');
const { Quotes } = require('../dest/entity/quotes');
const { Permissions } = require('../dest/entity/permissions');
const { User } = require('../dest/entity/user');
const { Price } = require('../dest/entity/price');
const { Rank } = require('../dest/entity/rank');
const { SongPlaylist, SongBan } = require('../dest/entity/song');
const { Timer, TimerResponse } = require('../dest/entity/timer');
const { Dashboard, Widget } = require('../dest/entity/dashboard');
const { Variable, VariableHistory, VaraibleWatch } = require('../dest/entity/variable');
const { Translation } = require('../dest/entity/translation');

const _ = require('lodash');

const argv = require('yargs')
  .usage('Usage: $0 --from <database> --to <database> --mongoUri <connectionUri>')
  .nargs('mongoUri', 1)
  .describe('from', 'database from migrate')
  .describe('mongoUri', 'connectionUri of your mongodb instance')
  .demandOption(['from'])
  .help('h')
  .alias('h', 'help')
  .alias('f', 'from')
  .epilog('  <database> can be ' + availableDbs.join(', ') + '\n\n!!! WARNING: All data on --to <database> will be erased !!!')
  .argv;

if (!availableDbs.includes(argv.from)) {
  return console.error('Error: From database ' + argv.from + ' is not supported - available options: ' + availableDbs.join(', '));
}
if ((argv.from === 'nedb') && (!fs.existsSync('./db') || (!fs.existsSync('./db/nedb')))) {
  return console.error('Error: no NeDB directory was found');
};
if ((argv.from === 'mongodb') && !argv.mongoUri) {
  return console.error('Error: --mongoUri needs to be defined for MongoDB');
};

const dbName = {
  from: function() {
    if (argv.from === 'mongodb') {
      return argv.mongoUri;
    } else {
      return null;
    };
  }
};

const from = new (require('../dest/databases/database'))(false, false, argv.from, dbName.from());
const connect = async function () {
  const connectionOptions = await getConnectionOptions();
  await createConnection({
    synchronize: true,
    logging: false,
    entities: [__dirname + '/../dest/entity/*.{js,ts}'],
    subscribers: [__dirname + '/../dest/entity/*.{js,ts}'],
    ...connectionOptions,
  });
};
async function main() {
  if (!from.engine.connected) {
    return setTimeout(() => main(), 1000);
  };
  await connect();
  await new Promise((resolve) => setTimeout(() => resolve(), 1000));

  const connection = await getConnection();

  console.log('Info: Databases connections established');

  let items;
  console.log('Migr: cache.titles');
  await getManager().clear(CacheTitles);
  items = (await from.engine.find('cache.titles')).map(o => {
    delete o._id; delete o.id; return {...o, timestamp: Number(o.timestamp || 0) };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(CacheTitles).insert(chunk)
    }
  }

  await getManager().clear(Settings);
  for (const type of ['core', 'overlays', 'games', 'registries', 'integrations', 'systems']) {
    console.log(`Migr: ${type}.settings`);
    for (const item of await from.engine.find(`${type}.settings`)) {
      if (item.key.includes('.') || typeof item.system === 'undefined') {
        continue;
      }
      await getRepository(Settings).insert({ namespace: `/${type}/${item.system}`, name: item.key, value: JSON.stringify(item.value) });
    }
  }

  console.log(`Migr: widgetsEventList`);
  await getManager().clear(EventList);
  items = (await from.engine.find('widgetsEventList')).map(o => {
    return {
      event: o.event,
      username: o.username,
      timestamp: Number(o.timestamp),
      values_json: JSON.stringify(
        Object.keys(o)
          .filter(key => !['event', 'username', 'timestamp'].includes(key))
          .reduce((obj, key) => {
            return {
              ...obj,
              [key]: o[key],
            };
          }, {}),
      ),
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(EventList).insert(chunk)
    }
  }

  console.log(`Migr: systems.quotes`);
  await getManager().clear(Quotes);
  items = (await from.engine.find('systems.quotes')).map(o => {
    delete o._id; delete o.id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Quotes).insert(chunk)
    }
  }

  console.log(`Migr: systems.alias`);
  await getManager().clear(Alias);
  items = (await from.engine.find('systems.alias')).map(o => {
    delete o._id; delete o.id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Alias).insert(chunk)
    }
  }

  console.log(`Migr: systems.customcommands, systems.customcommands.responses`);
  if (connection.options.type === 'postgres') {
    await getRepository(Commands).query('TRUNCATE "commands" CASCADE');
  } else {
    await getRepository(Commands).clear();
  }
  items = await from.engine.find('systems.customcommands');
  for (const item of items) {
    // add responses
    const responses = (await from.engine.find('systems.customcommands.responses', { cid: item.id })).map(o => {
      delete o._id; delete o.id;
      if (typeof o.filter === 'undefined') {
        o.filter = '';
      }
      if (typeof o.stopIfExecuted === 'undefined') {
        o.stopIfExecuted = false;
      }
      return o;
    });
    item.responses = responses;
  }
  items = items.map(o => {
    delete o._id; delete o.id; delete o.cid; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Commands).save(chunk);
    }
  }

  console.log(`Migr: core.commands.count `);
  await getManager().clear(CommandsCount);
  items = (await from.engine.find('core.commands.count')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(CommandsCount).insert(chunk);
    }
  }

  console.log(`Migr: permissions`);
  if (connection.options.type === 'postgres') {
    await getRepository(Permissions).query('TRUNCATE "permissions" CASCADE');
  } else {
    await getRepository(Permissions).clear();
  }
  items = (await from.engine.find('core.permissions')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Permissions).insert(chunk)
    }
  }

  console.log(`Migr: systems.cooldowns`);
  if (connection.options.type === 'postgres') {
    await getRepository(Cooldown).query('TRUNCATE "cooldown" CASCADE');
  } else {
    await getRepository(Cooldown).clear();
  }
  items = (await from.engine.find('systems.cooldown')).map(o => {
    delete o._id; return {
      name: o.key,
      miliseconds: o.miliseconds,
      type: o.type,
      timestamp: o.timestamp,
      isErrorMsgQuiet: o.quiet,
      isEnabled: o.enabled,
      isOwnerAffected: o.owner || false,
      isModeratorAffected: o.moderator || false,
      isSubscriberAffected: o.subscriber || false,
      isFollowerAffected: o.follower || false,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Cooldown).save(chunk);
    }
  }

  console.log(`Migr: systems.highlights`);
  await getManager().clear(Highlight);
  items = (await from.engine.find('systems.highlights')).map(o => {
    return {
      videoId: o.id,
      timestamp: o.timestamp,
      game: o.game,
      title: o.title,
      createdAt: (new Date(o.created_at)).getTime() || (Date.now() - 1000 * 60 * 60 * 24 * 31),
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Highlight).save(chunk);
    }
  }

  console.log(`Migr: systems.howlongtobeat`);
  await getManager().clear(HowLongToBeatGame);
  items = (await from.engine.find('systems.howlongtobeat')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    // save unique games
    for (const game of [...new Set(items.map(o => o.game))]) {
      // remove IRL
      if (game === 'IRL') {
        continue;
      }
      await getRepository(HowLongToBeatGame).save(items.find(o => o.game === game));
    }
  }

  console.log(`Migr: systems.keywords`);
  await getManager().clear(Keyword);
  items = (await from.engine.find('systems.keywords')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Keyword).save(chunk);
    }
  }

  console.log(`Migr: users, users.tips, users.points, users.message, users.bits`);
  if (connection.options.type === 'postgres') {
    await getRepository(User).query('TRUNCATE "user" CASCADE');
  } else {
    await getRepository(User).clear();
  }

  const points = await from.engine.find('users.points');
  const tips = await from.engine.find('users.tips');
  const messages = await from.engine.find('users.messages');
  const bits = await from.engine.find('users.bits');
  const watched = await from.engine.find('users.watched');
  const chat = await from.engine.find('users.chat');

  items = (await from.engine.find('users')).map(o => {
    return {
      userId: o.id,
      username: o.username,

      isOnline: false,
      isFollower: _.get(o, 'is.follower', false),
      isModerator: _.get(o, 'is.moderator', false),
      isSubscriber: _.get(o, 'is.subscriber', false),

      haveSubscriberLock: _.get(o, 'lock.subscriber', false),
      haveFollowerLock: _.get(o, 'lock.follower', false),
      haveSubscribedAtLock: _.get(o, 'lock.subscribed_at', false),
      haveFollowedAtLock: _.get(o, 'lock.followed_at', false),

      rank: '',
      haveCustomRank: false,

      followedAt: new Date(_.get(o, 'time.follow', 0)).getTime(),
      followCheckAt: Date.now(),
      subscribedAt: new Date(_.get(o, 'time.subscribedAt', 0)).getTime(),
      seenAt: new Date(_.get(o, 'time.message', 0)).getTime(),
      createdAt: new Date(_.get(o, 'time.created_at', 0)).getTime(),
      watchedTime: (watched.find(w => w.id === o.id) || { watched: 0 }).watched,
      chatTimeOnline: (chat.find(w => w.id === o.id && w.online) || { chat: 0 }).chat,
      chatTimeOffline: (chat.find(w => w.id === o.id && !w.online) || { chat: 0 }).chat,

      points: (points.find(m => m.id === o.id) || { points: 0 }).points,
      pointsOnlineGivenAt: Date.now(),
      pointsOfflineGivenAt: Date.now(),
      pointsByMessageGivenAt: (messages.find(m => m.id === o.id) || { messages: 0 }).messages,

      tips: tips.filter(t => t.id === o.id).map(t => {
        return {
          amount: t.amount,
          currency: t.currency,
          message: t.message,
          tippedAt: t.timestamp,
          sortAmount: t._amount,
        }
      }),

      bits: bits.filter(t => t.id === o.id).map(t => {
        return {
          amount: t.amount,
          message: t.message,
          cheeredAt: t.timestamp,
        }
      }),

      messages: (messages.find(m => m.id === o.id) || { messages: 0 }).messages,
      giftedSubscribes: _.get(o, 'custom.subgiftCount', 0)
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      try {
        await getRepository(User).save(chunk);
      } catch (e) {
        throw Error('Error Importing User ' + JSON.stringify(item));
      }
    }
  }

  console.log(`Migr: systems.price`);
  await getManager().clear(Keyword);
  items = (await from.engine.find('systems.price')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Price).save(chunk);
    }
  }

  console.log(`Migr: systems.ranks`);
  await getManager().clear(Rank);
  items = (await from.engine.find('systems.ranks')).map(o => {
    delete o._id; return {
      hours: o.hours,
      rank: o.value,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Rank).save(chunk);
    }
  }

  console.log(`Migr: systems.songs.playlist`);
  await getManager().clear(SongPlaylist);
  items = (await from.engine.find('systems.songs.playlist')).map(o => {
    return {
      seed: 1,
      title: o.title,
      videoId: o.videoID,
      endTime: o.endTime || o.length_seconds,
      startTime: o.startTime || 0,
      length: o.length_seconds,
      loudness: o.loudness || -15,
      lastPlayedAt: o.lastPlayedAt,
      forceVolume: o.forceVolume || false,
      volume: o.volume || 25,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(SongPlaylist).save(chunk);
    }
  }

  console.log(`Migr: systems.songs.ban`);
  await getManager().clear(SongBan);
  items = (await from.engine.find('systems.songs.ban')).map(o => {
    return {
      title: o.title,
      videoId: o.videoId,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(SongBan).save(chunk);
    }
  }

  console.log(`Migr: systems.timers, systems.timers.responses`);
  await getManager().clear(TimerResponse);
  await getManager().clear(Timer);

  const responses = await from.engine.find('systems.timers.responses');
  items = (await from.engine.find('systems.timers')).map(o => {
    return {
      name: o.name,
      triggerEveryMessage: o.messages,
      triggerEverySecond: o.seconds,
      triggeredAtTimestamp: o.trigger.seconds || Date.now(),
      triggeredAtMessages: o.trigger.messages,
      isEnabled: o.enabled,
      messages: responses
        .filter(f => String(o.id) === String(f.timerId))
        .map(f => {
          return {
            timestamp: f.timestamp,
            isEnabled: f.enabled,
            response: f.response,
          };
        }),
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Timer).save(chunk);
    }
  }

  console.log(`Migr: dashboards, widgets`);
  await getManager().clear(Widget);
  await getManager().clear(Dashboard);

  const widgets = await from.engine.find('widgets');
  items = (await from.engine.find('dashboards')).map(o => {
    return {
      name: o.name,
      createdAt: o.createdAt,
      widgets: widgets
        .filter(f => String(o.id) === String(f.dashboardId))
        .map(f => {
          return {
            name: f.id,
            positionX: f.position.x,
            positionY: f.position.y,
            height: f.size.height,
            width: f.size.width,
          };
        }),
    };
  });
  items.push({
    id: 'c287b750-b620-4017-8b3e-e48757ddaa83', // constant ID
    name: 'Main',
    createdAt: 0,
    widgets: widgets
      .filter(f => f.dashboardId === null)
      .map(f => {
        return {
          name: f.id,
          positionX: f.position.x,
          positionY: f.position.y,
          height: f.size.height,
          width: f.size.width,
        };
      }),
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Dashboard).save(chunk);
    }
  }

  console.log(`Migr: custom.variables, custom.variables.history`);
  await getManager().clear(VariableHistory);
  await getManager().clear(Variable);
  const history = (await from.engine.find('custom.variables.history'))
  items = (await from.engine.find('custom.variables')).map(o => {
    return {
      id: o.id,
      variableName: o.variableName,
      type: o.type,
      runEvery: Number(o.runEvery),
      currentValue: o.currentValue,
      description: o.description,
      evalValue: o.evalValue,
      runEveryTypeValue: o.runEveryTypeValue,
      responseType: o.responseType,
      runEveryType: o.runEveryType,
      runEvery: o.runEvery,
      responseText: o.responseText,
      permission: o.permission,
      readOnly: o.readOnly,
      usableOptions: o.usableOptions.split(',').map(o => o.trim()),
      runAt: o.runAt,
      history: history.filter(h => h.cvarId === o.id)
        .map(hm => {
          return {
            userId: hm.sender ? hm.sender.userId : 0,
            username: hm.sender ? hm.sender.username : 'n/a',
            oldValue: hm.oldValue,
            currentValue: hm.currentValue,
            changedAt: new Date(hm.timestamp).getTime(),
          }
        }),
      urls: o.urls ? o.urls.map(u => {
        return {
          id: u.id,
          GET: u.access.GET,
          POST: u.access.POST,
          showResponse: u.showResponse
        }
      }) : [],
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Variable).save(chunk);
    }
  }

  console.log(`Migr: customTranslations`);
  await getManager().clear(Translation);
  items = (await from.engine.find('customTranslations')).map(o => {
    return {
      name: o.key,
      value: o.value,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.')
      await getRepository(Translation).save(chunk);
    }
  }

  console.log('Info: Completed');
  process.exit();
};

console.log('Info: Connecting to dbs');
main();
