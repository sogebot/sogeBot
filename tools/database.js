/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';
require('module-alias/register');

const fs = require('fs');

const availableDbs = ['nedb', 'mongodb'];
const uuid = require('uuid/v4');

const { createConnection, getConnection, getConnectionOptions, getManager, getRepository } = require('typeorm');
const { Alias } = require('../dest/database/entity/alias');
const { Commands, CommandsCount, CommandsBoard } = require('../dest/database/entity/commands');
const { Cooldown } = require('../dest/database/entity/cooldown');
const { CacheTitles } = require('../dest/database/entity/cacheTitles');
const { Highlight } = require('../dest/database/entity/highlight');
const { HowLongToBeatGame } = require('../dest/database/entity/howLongToBeatGame');
const { Keyword } = require('../dest/database/entity/keyword');
const { Settings } = require('../dest/database/entity/settings');
const { EventList } = require('../dest/database/entity/eventList');
const { Quotes } = require('../dest/database/entity/quotes');
const { Permissions, PermissionCommands } = require('../dest/database/entity/permissions');
const { User } = require('../dest/database/entity/user');
const { Price } = require('../dest/database/entity/price');
const { Rank } = require('../dest/database/entity/rank');
const { SongPlaylist, SongBan } = require('../dest/database/entity/song');
const { Timer, TimerResponse } = require('../dest/database/entity/timer');
const { Dashboard, Widget } = require('../dest/database/entity/dashboard');
const { Variable, VariableHistory, VariableWatch } = require('../dest/database/entity/variable');
const { Translation } = require('../dest/database/entity/translation');
const { Event, EventOperation } = require('../dest/database/entity/event');
const { Goal, GoalGroup } = require('../dest/database/entity/goal');
const { TwitchClips, TwitchStats } = require('../dest/database/entity/twitch');
const { Carousel } = require('../dest/database/entity/carousel');
const { Gallery } = require('../dest/database/entity/gallery');
const { Alert, AlertMedia } = require('../dest/database/entity/alert');
const { Text } = require('../dest/database/entity/text');

const Datastore = require('nedb');
const mongodbUri = require('mongodb-uri');
const client = require('mongodb').MongoClient;

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
  },
};


class INeDB {
  constructor () {
    this.connected = true; // slow down for proper load

    if (!fs.existsSync('./db')) {
      fs.mkdirSync('./db');
    }
    if (!fs.existsSync('./db/nedb')) {
      fs.mkdirSync('./db/nedb');
    }
    this.table = {};
  }

  on (table) {
    if (_.isNil(this.table[table])) {
      this.table[table] = new Datastore({ filename: './db/nedb/' + table + '.db', autoload: true });
      this.table[table].persistence.setAutocompactionInterval(60000);
    }
    return this.table[table];
  }

  async find (table) {
    this.on(table); // init table

    return new Promise((resolve, reject) => {
      this.on(table).find({}, async (err, items) => {
        if (err) {
          error(err.message);
          error(util.inspect({ type: 'find', table, where }));
        }
        resolve(items || []);
      });
    });
  }
}

class IMongoDB {
  constructor (mongoUri) {
    this.connected = false;
    this.client = null;

    this.mongoUri = mongoUri;
    this.dbName = mongodbUri.parse(this.mongoUri).database;

    this.connect();
  }

  getClient() {
    return this.client.db(this.dbName);
  }

  async connect () {
    this.client = await client.connect(this.mongoUri,
      {
        useNewUrlParser: true,
        reconnectTries: Number.MAX_VALUE,
        connectTimeoutMS: 60000,
        useUnifiedTopology: true,
      });
    this.connected = true;
  }

  async find (table) {
    try {
      const db = this.client.db(this.dbName);
      const items = await db.collection(table).find({});
      return items.toArray();
    } catch (e) {
      error(e.stack);
      if (e.message.match(/EPIPE/g)) {
        error('Something went wrong with mongodb instance (EPIPE error)');
        process.exit();
      }
    }
  }
}

let from;
if (argv.from === 'nedb') {
  from = new INeDB();
} else {
  from = new IMongoDB(dbName.from());
}
const connect = async function () {
  const connectionOptions = await getConnectionOptions();
  await createConnection({
    ...connectionOptions,
  });
};
async function main() {
  if (!from.connected) {
    return setTimeout(() => main(), 1000);
  };
  await connect();
  await new Promise((resolve) => setTimeout(() => resolve(), 1000));

  console.log('Info: Databases connections established');

  let items;
  console.log('Migr: cache.titles');
  items = (await from.find('cache.titles')).map(o => {
    delete o._id; delete o.id; return {...o, timestamp: Number(o.timestamp || 0) };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(CacheTitles).insert(chunk);
    }
    console.log();
  }

  for (const type of ['core', 'overlays', 'games', 'registries', 'integrations', 'systems']) {
    console.log(`Migr: ${type}.settings`);
    for (const item of await from.find(`${type}.settings`)) {
      if (item.key.includes('.') || typeof item.system === 'undefined') {
        continue;
      }
      await getRepository(Settings).insert({ namespace: `/${type}/${item.system}`, name: item.key, value: JSON.stringify(item.value) });
    }
  }

  console.log(`Migr: core.permissions.commands`);
  items = await from.find('core.permissions.commands');
  items.map(o => {
    o.name = o.key;
    delete o.key;
    return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(PermissionCommands).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: widgetsEventList`);
  items = (await from.find('widgetsEventList')).map(o => {
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
      process.stdout.write('.');
      await getRepository(EventList).insert(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.quotes`);
  items = (await from.find('systems.quotes')).map(o => {
    delete o._id; delete o.id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Quotes).insert(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.alias`);
  items = (await from.find('systems.alias')).map(o => {
    delete o._id; delete o.id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Alias).insert(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.customcommands, systems.customcommands.responses`);
  items = await from.find('systems.customcommands');
  for (const item of items) {
    // add responses
    const responses = (await from.find('systems.customcommands.responses')).map(o => {
      delete o._id; delete o.id;
      if (typeof o.filter === 'undefined') {
        o.filter = '';
      }
      if (typeof o.stopIfExecuted === 'undefined') {
        o.stopIfExecuted = false;
      }
      return o;
    }).filter(o => {
      return o.cid === item.id
    });
    item.responses = responses;
  }
  items = items.map(o => {
    delete o._id; delete o.id; delete o.cid; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Commands).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: core.commands.count `);
  items = (await from.find('core.commands.count')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(CommandsCount).insert(chunk);
    }
    console.log();
  }

  console.log(`Migr: core.permissions`);
  items = (await from.find('core.permissions')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Permissions).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.cooldowns`);
  items = (await from.find('systems.cooldown')).map(o => {
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
      process.stdout.write('.');
      await getRepository(Cooldown).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.highlights`);
  items = (await from.find('systems.highlights')).map(o => {
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
      process.stdout.write('.');
      await getRepository(Highlight).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.howlongtobeat`);
  items = (await from.find('systems.howlongtobeat')).map(o => {
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
  items = (await from.find('systems.keywords')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Keyword).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: users, users.tips, users.points, users.message, users.bits`);
  const points = await from.find('users.points');
  const tips = await from.find('users.tips');
  const messages = await from.find('users.messages');
  const bits = await from.find('users.bits');
  const watched = await from.find('users.watched');
  const chat = await from.find('users.chat');

  items = (await from.find('users')).map(o => {
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
        };
      }),

      bits: bits.filter(t => t.id === o.id).map(t => {
        return {
          amount: t.amount,
          message: t.message,
          cheeredAt: t.timestamp,
        };
      }),

      messages: (messages.find(m => m.id === o.id) || { messages: 0 }).messages,
      giftedSubscribes: _.get(o, 'custom.subgiftCount', 0),
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
    console.log();
  }

  console.log(`Migr: systems.price`);
  items = (await from.find('systems.price')).map(o => {
    delete o._id; return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Price).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.ranks`);
  items = (await from.find('systems.ranks')).map(o => {
    delete o._id; return {
      hours: o.hours,
      rank: o.value,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Rank).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.songs.playlist`);
  items = (await from.find('systems.songs.playlist')).map(o => {
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
      process.stdout.write('.');
      await getRepository(SongPlaylist).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.songs.ban`);
  items = (await from.find('systems.songs.ban')).map(o => {
    return {
      title: o.title,
      videoId: o.videoId,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(SongBan).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: systems.timers, systems.timers.responses`);

  const responses = await from.find('systems.timers.responses');
  items = (await from.find('systems.timers')).map(o => {
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
      process.stdout.write('.');
      await getRepository(Timer).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: dashboards, widgets`);

  const widgets = await from.find('widgets');
  items = (await from.find('dashboards')).map(o => {
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
      process.stdout.write('.');
      await getRepository(Dashboard).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: custom.variables, custom.variables.history`);
  const history = (await from.find('custom.variables.history'));
  items = (await from.find('custom.variables')).map(o => {
    return {
      id: o.id,
      variableName: o.variableName,
      type: o.type,
      currentValue: o.currentValue,
      description: o.description,
      evalValue: o.evalValue,
      responseType: o.responseType || 0,
      runEveryTypeValue: o.runEveryTypeValue || 0,
      runEveryType: o.runEveryType || 0,
      runEvery: o.runEvery || 0,
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
          };
        }),
      urls: o.urls ? o.urls.map(u => {
        return {
          id: u.id,
          GET: u.access.GET,
          POST: u.access.POST,
          showResponse: u.showResponse,
        };
      }) : [],
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Variable).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: customTranslations`);
  items = (await from.find('customTranslations')).map(o => {
    return {
      name: o.key,
      value: o.value,
    };
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Translation).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: events`);
  const operations = await from.find('events.operations');
  items = (await from.find('events'))
    .map(o => {
      return {
        name: o.key,
        givenName: o.name,
        isEnabled: o.enabled,
        triggered: o.triggered,
        definitions: o.definitions,
        filter: o.filter || '',
        operations: operations.filter(f => f.eventId === o.id)
          .map(f => {
            return {
              name: f.key,
              definitions: f.definitions,
            };
          }),
      };
    });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Event).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: overlays.goals.groups`);
  const goals = await from.find('overlays.goals.goals');
  items = (await from.find('overlays.goals.groups'))
    .map(o => {
      return {
        id: o.uid,
        name: o.name,
        createdAt: o.createdAt,
        display: o.display,
        goals: goals.filter(f => f.groupId === o.uid)
          .map(f => {
            return {
              ...f,
              id: f.uid,
              countBitsAsTips: f.countBitsAsTips || false,
              endAfterIgnore: f.endAfterIgnore || false,
              endAfter: f.endAfter,
              customizationBar: f.customization.bar,
              customizationFont: f.customization.font,
              customizationHtml: f.customization.html,
              customizationJs: f.customization.js,
              customizationCss: f.customization.css,
            };
          }),
      };
    });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(GoalGroup).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: stats`);
  items = (await from.find('stats'))
    .map(o => {
      return {
        whenOnline: new Date(o.whenOnline).getTime(),
        currentViewers: o.currentViewers || 0,
        currentSubscribers: o.currentSubscribers || 0,
        currentBits: o.currentBits || 0,
        currentTips: o.currentTips || 0,
        chatMessages: o.chatMessages || 0,
        currentFollowers: o.currentFollowers || 0,
        currentViews: o.currentViews || 0,
        maxViewers: o.maxViewers || 0,
        currentHosts: o.currentHosts || 0,
        newChatters: o.newChatters || 0,
        currentWatched: o.currentWatched || 0,
      };
    });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(TwitchStats).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: api.clips`);
  items = (await from.find('api.clips'))
    .map(o => {
      o.shouldBeCheckedAt = new Date(o.shouldBeCheckedAt).getTime(); return o;
    });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(TwitchClips).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: overlays.carousel`);
  items = await from.find('overlays.carousel');
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Carousel).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: overlays.gallery`);
  items = await from.find('overlays.gallery');
  items.map(o => {
    o.name = o.name || uuid();
    return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Gallery).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: registries.alerts`);
  items = await from.find('registries.alerts');
  items.map(o => {
    o.cheers = o.alerts.cheers;
    o.follows = o.alerts.follows;
    o.hosts = o.alerts.hosts;
    o.raids = o.alerts.raids;
    o.resubs = o.alerts.resubs;
    o.subgifts = o.alerts.subgifts;
    o.subs = o.alerts.subs;
    o.tips = o.alerts.tips;
    delete o.alerts;
    return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Alert).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: registries.alerts.media`);
  items = await from.find('registries.alerts.media');
  items.map(o => {
    o.chunkNo = o.chunk;
    return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(AlertMedia).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: registries.text`);
  items = await from.find('registries.text');
  items.map(o => {
    o.external = o.external || [];
    return o;
  });
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(Text).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: widgetsCmdBoard`);
  items = await from.find('widgetsCmdBoard');
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(CommandsBoard).save(chunk);
    }
    console.log();
  }

  console.log(`Migr: custom.variables.watch`);
  items = await from.find('custom.variables.watch');
  if (items.length > 0) {
    for (const chunk of _.chunk(items, 100)) {
      process.stdout.write('.');
      await getRepository(VariableWatch).save(chunk);
    }
    console.log();
  }

  console.log('Info: Completed');
  process.exit();
};

console.log('Info: Connecting to dbs');
main();
