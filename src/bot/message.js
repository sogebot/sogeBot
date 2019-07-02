const mathjs = require('mathjs');
const axios = require('axios');
const safeEval = require('safe-eval');
const decode = require('decode-html');
const querystring = require('querystring');
const _ = require('lodash');
const crypto = require('crypto');
const commons = require('./commons');
const gitCommitInfo = require('git-commit-info');
const Entities = require('html-entities').AllHtmlEntities;

import { getCountOfCommandUsage } from './helpers/commands/count';

class Message {
  constructor (message) {
    this.message = Entities.decode(message);
  }

  async global (opts) {
    let variables = [
      'game', 'viewers', 'views', 'followers',
      'hosts', 'subscribers', 'bits', 'title'
    ];
    let items = await global.db.engine.find('api.current');
    for (let variable of variables) {
      const regexp = new RegExp(`\\$${variable}`, 'g');
      let value = _.find(items, (o) => o.key === variable);
      value = _.isEmpty(value) ? '' : value.value;
      this.message = this.message.replace(regexp, value);
    }

    const version = _.get(process, 'env.npm_package_version', 'x.y.z');
    this.message = this.message.replace(/\$version/g, version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));

    let events = _.orderBy(await global.db.engine.find('widgetsEventList'), 'timestamp', 'desc');
    // latestFollower
    let latestFollower = _.find(events, (o) => o.event === 'follow');
    this.message = this.message.replace(/\$latestFollower/g, !_.isNil(latestFollower) ? latestFollower.username : 'n/a');

    // latestSubscriber
    let latestSubscriber = _.find(events, (o) => ['sub', 'resub', 'subgift'].includes(o.event));
    this.message = this.message.replace(/\$latestSubscriber/g, !_.isNil(latestSubscriber) ? latestSubscriber.username : 'n/a');

    // latestTip, latestTipAmount, latestTipCurrency, latestTipMessage
    let latestTip = _.find(events, (o) => o.event === 'tip');
    this.message = this.message.replace(/\$latestTipAmount/g, !_.isNil(latestTip) ? parseFloat(latestTip.amount).toFixed(2) : 'n/a');
    this.message = this.message.replace(/\$latestTipCurrency/g, !_.isNil(latestTip) ? latestTip.currency : 'n/a');
    this.message = this.message.replace(/\$latestTipMessage/g, !_.isNil(latestTip) ? latestTip.message : 'n/a');
    this.message = this.message.replace(/\$latestTip/g, !_.isNil(latestTip) ? latestTip.username : 'n/a');

    // latestCheer, latestCheerAmount, latestCheerCurrency, latestCheerMessage
    let latestCheer = _.find(events, (o) => o.event === 'cheer');
    this.message = this.message.replace(/\$latestCheerAmount/g, !_.isNil(latestCheer) ? parseInt(latestCheer.amount, 10) : 'n/a');
    this.message = this.message.replace(/\$latestCheerMessage/g, !_.isNil(latestCheer) ? latestCheer.message : 'n/a');
    this.message = this.message.replace(/\$latestCheer/g, !_.isNil(latestCheer) ? latestCheer.username : 'n/a');

    const spotifySong = JSON.parse(global.integrations.spotify.currentSong);
    if (!_.isNil(global.integrations) && !_.isEmpty(spotifySong) && spotifySong.is_playing && spotifySong.is_enabled) {
      // load spotify format
      const format = global.integrations.spotify.format;
      if (opts.escape) {
        spotifySong.song = spotifySong.song.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
        spotifySong.artist = spotifySong.artist.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
      }
      this.message = this.message.replace(/\$spotifySong/g, format.replace(/\$song/g, spotifySong.song).replace(/\$artist/g, spotifySong.artist));
    } else {this.message = this.message.replace(/\$spotifySong/g, global.translate('songs.not-playing'))};


    if (await global.systems.songs.isEnabled() && this.message.includes('$ytSong')) {
      let currentSong = _.get(JSON.parse(await global.systems.songs.currentSong), 'title', global.translate('songs.not-playing'));
      if (opts.escape) {
        currentSong = currentSong.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
      }
      this.message = this.message.replace(/\$ytSong/g, currentSong);
    } else {this.message = this.message.replace(/\$ytSong/g, global.translate('songs.not-playing'))};

    return Entities.decode(this.message);
  }

  async parse (attr) {
    this.message = await this.message; // if is promise

    let random = {
      '(random.online.viewer)': async function () {
        const usernames = await global.users.getAllOnlineUsernames();
        const onlineViewers = usernames.filter((username) => {
          const isSender = username === attr.sender.username;
          const isBot = commons.isBot(username);
          const isIgnored = commons.isIgnored({ username });
          return !isSender && !isBot && !isIgnored;
        });
        if (onlineViewers.length === 0) {return 'unknown'};
        return _.sample(onlineViewers);
      },
      '(random.online.follower)': async function () {
        const usernames = await global.users.getAllOnlineUsernames();
        const onlineViewers = usernames.filter((username) => {
          const isSender = username === attr.sender.username;
          const isBot = commons.isBot(username);
          const isIgnored = commons.isIgnored({ username });
          return !isSender && !isBot && !isIgnored;
        });
        const followers = _.filter(
          (await global.db.engine.find('users', { is: { follower: true } })).map((o) => o.username),
          (o) => o !== attr.sender && o !== global.oauth.botUsername.toLowerCase());
        let onlineFollowers = _.intersection(onlineViewers, followers);
        if (onlineFollowers.length === 0) {return 'unknown'};
        return _.sample(onlineFollowers);
      },
      '(random.online.subscriber)': async function () {
        const usernames = await global.users.getAllOnlineUsernames();
        const onlineViewers = usernames.filter((username) => {
          const isSender = username === attr.sender.username;
          const isBot = commons.isBot(username);
          const isIgnored = commons.isIgnored({ username });
          return !isSender && !isBot && !isIgnored;
        });
        const subscribers = _.filter(
          (await global.db.engine.find('users', { is: { subscriber: true } })).map((o) => o.username),
          (o) => o !== attr.sender && o !== global.oauth.botUsername.toLowerCase());
        let onlineSubscribers = _.intersection(onlineViewers, subscribers);
        if (onlineSubscribers.length === 0) {return 'unknown'};
        return _.sample(onlineSubscribers);
      },
      '(random.viewer)': async function () {
        let viewer = (await global.users.getAll()).map((o) => o.username);
        viewer = viewer.filter((username) => {
          const isSender = username === attr.sender.username;
          const isBot = commons.isBot(username);
          const isIgnored = commons.isIgnored({ username });
          return !isSender && !isBot && !isIgnored;
        });
        if (viewer.length === 0) {return 'unknown'};
        return _.sample(viewer);
      },
      '(random.follower)': async function () {
        let follower = (await global.db.engine.find('users', { is: { follower: true } })).map((o) => o.username);
        follower = follower.filter((username) => {
          const isSender = username === attr.sender.username;
          const isBot = commons.isBot(username);
          const isIgnored = commons.isIgnored({ username });
          return !isSender && !isBot && !isIgnored;
        });
        if (follower.length === 0) {return 'unknown'};
        return _.sample(follower);
      },
      '(random.subscriber)': async function () {
        let subscriber = (await global.db.engine.find('users', { is: { subscriber: true } })).map((o) => o.username);
        subscriber = subscriber.filter((username) => {
          const isSender = username === attr.sender.username;
          const isBot = commons.isBot(username);
          const isIgnored = commons.isIgnored({ username });
          return !isSender && !isBot && !isIgnored;
        });
        if (subscriber.length === 0) {return 'unknown'};
        return _.sample(subscriber);
      },
      '(random.number-#-to-#)': async function (filter) {
        let numbers = filter.replace('(random.number-', '')
          .replace(')', '')
          .split('-to-');

        try {
          let lastParamUsed = 0;
          for (let index in numbers) {
            if (!_.isFinite(parseInt(numbers[index], 10))) {
              let param = attr.param.split(' ');
              if (_.isNil(param[lastParamUsed])) {return 0};

              numbers[index] = param[lastParamUsed];
              lastParamUsed++;
            }
          }
          return _.random(numbers[0], numbers[1]);
        } catch (e) {
          return 0;
        }
      },
      '(random.true-or-false)': async function () {
        return Math.random() < 0.5;
      }
    };
    let custom = {
      '$_#': async (variable) => {
        if (!_.isNil(attr.param) && attr.param.length !== 0) {
          let state = await global.customvariables.setValueOf(variable, attr.param, { sender: attr.sender });
          if (state.updated.responseType === 0) {
            // default
            if (state.isOk && !state.isEval) {
              let msg = await commons.prepare('filters.setVariable', { value: state.updated.setValue, variable: variable });
              commons.sendMessage(msg, attr.sender, { skip: true, quiet: _.get(attr, 'quiet', false) });
            }
            return state.updated.currentValue;
          } else if (state.updated.responseType === 1) {
            // custom
            commons.sendMessage(state.updated.responseText.replace('$value', state.updated.setValue), attr.sender, { skip: true, quiet: _.get(attr, 'quiet', false) });
            return '';
          } else {
            // command
            return state.updated.currentValue;
          }
        }
        return global.customvariables.getValueOf(variable, { sender: attr.sender, param: attr.param });
      },
      // force quiet variable set
      '$!_#': async (variable) => {
        variable = variable.replace('$!_', '$_');
        if (!_.isNil(attr.param) && attr.param.length !== 0) {
          let state = await global.customvariables.setValueOf(variable, attr.param, { sender: attr.sender });
          return state.updated.currentValue;
        }
        return global.customvariables.getValueOf(variable, { sender: attr.sender, param: attr.param });
      },
      // force full quiet variable
      '$!!_#': async (variable) => {
        variable = variable.replace('$!!_', '$_');
        if (!_.isNil(attr.param) && attr.param.length !== 0) {
          await global.customvariables.setValueOf(variable, attr.param, { sender: attr.sender });
        }
        return '';
      }
    };
    let param = {
      '$touser': async function (filter) {
        if (typeof attr.param !== 'undefined') {
          attr.param = attr.param.replace('@', '');
          if (attr.param.length > 0) {
            if (global.tmi.showWithAt) {
              attr.param = '@' + attr.param;
            }
            return attr.param;
          }
        }
        return (global.tmi.showWithAt ? '@' : '') + attr.sender.username;
      },
      '$param': async function (filter) {
        if (!_.isUndefined(attr.param) && attr.param.length !== 0) {return attr.param};
        return '';
      },
      '$!param': async function (filter) {
        if (!_.isUndefined(attr.param) && attr.param.length !== 0) {return attr.param};
        return 'n/a';
      }
    };
    let qs = {
      '$querystring': async function (filter) {
        if (!_.isUndefined(attr.param) && attr.param.length !== 0) {return querystring.escape(attr.param)};
        return '';
      },
      '(url|#)': async function (filter) {
        try {
          return encodeURI(/\(url\|(.*)\)/g.exec(filter)[1]);
        } catch (e) {
          return '';
        }
      }
    };
    let info = {
      '$toptip.#.#': async function (filter) {
        const match = filter.match(/\$toptip\.(?<type>overall|stream)\.(?<value>username|amount|message|currency)/);
        if (!match) {
          return '';
        }

        let tips = (await global.db.engine.find('widgetsEventList', { event: 'tip' })).sort((a, b) => {
          const aTip = global.currency.exchange(a.amount, a.currency, global.currency.mainCurrency);
          const bTip = global.currency.exchange(b.amount, b.currency, global.currency.mainCurrency);
          return bTip - aTip;
        }, 0);

        if (match.groups.type === 'stream') {
          const whenOnline = (await global.cache.when()).online;
          if (whenOnline) {
            tips = tips.filter((o) => o.timestamp >= (new Date(whenOnline)).getTime());
          } else {
            return '';
          }
        }

        if (tips.length > 0) {
          if (match.groups.value === 'amount') {
            return Number(tips[0][match.groups.value]).toFixed(2);
          } else {
            return tips[0][match.groups.value];
          }
        }
        return '';
      },
      '(game)': async function (filter) {
        return _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a');
      },
      '(status)': async function (filter) {
        return _.get(await global.db.engine.findOne('api.current', { key: 'title' }), 'value', 'n/a');
      }
    };
    let command = {
      '$count(\'#\')': async function (filter) {
        const countRegex = new RegExp('\\$count\\(\\\'(?<command>\\!\\S*)\\\'\\)', 'gm');
        let match = countRegex.exec(filter);
        if (match && match.groups) {
          return String(await getCountOfCommandUsage(match.groups.command));
        }
        return '0';
      },
      '$count': async function (filter) {
        if (attr.cmd) {
          return String((await getCountOfCommandUsage(attr.cmd)));
        }
        return '0';
      },
      '(!!#)': async function (filter) {
        let cmd = filter
          .replace('!', '') // replace first !
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.tmi.showWithAt ? '@' : '') + attr.sender.username)
          .replace(/\$param/g, attr.param);
        global.tmi.message({
          message: {
            tags: attr.sender,
            message: cmd,
          },
          skip: true,
          quiet: true
        });
        return '';
      },
      '(!#)': async function (filter) {
        let cmd = filter
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.tmi.showWithAt ? '@' : '') + attr.sender.username)
          .replace(/\$param/g, attr.param);
        global.tmi.message({
          message: {
            tags: attr.sender,
            message: cmd,
          },
          skip: true,
          quiet: false
        });
        return '';
      }
    };
    let price = {
      '(price)': async function (filter) {
        let price = 0;
        if (await global.systems.price.isEnabled()) {
          let command = await global.db.engine.findOne(global.systems.price.collection.data, { command: attr.cmd });
          price = _.isEmpty(command) ? 0 : command.price;
        }
        return [price, await global.systems.points.getPointsName(price)].join(' ');
      }
    };
    let online = {
      '(onlineonly)': async function (filter) {
        return global.cache.isOnline();
      },
      '(offlineonly)': async function (filter) {
        return !(await global.cache.isOnline());
      }
    };
    let list = {
      '(list.#)': async function (filter) {
        let [system, permission] = filter.replace('(list.', '').replace(')', '').split('.');

        let [alias, commands, cooldowns, ranks, prices] = await Promise.all([
          global.db.engine.find(global.systems.alias.collection.data, { visible: true, enabled: true }),
          global.db.engine.find(global.systems.customCommands.collection.data, { visible: true, enabled: true }),
          global.db.engine.find(global.systems.cooldown.collection.data, { enabled: true }),
          global.db.engine.find(global.systems.ranks.collection.data),
          global.db.engine.find(global.systems.price.collection.data, { enabled: true })
        ]);

        switch (system) {
          case 'alias':
            return _.size(alias) === 0 ? ' ' : (_.map(alias, (o) => o.alias.replace('!', ''))).join(', ');
          case '!alias':
            return _.size(alias) === 0 ? ' ' : (_.map(alias, 'alias')).join(', ');
          case 'command':
            if (permission) {
              const responses = await global.db.engine.find(global.systems.customCommands.collection.responses);
              const _permission = await global.permissions.get(permission);
              if (_permission) {
                const commandIds = responses.filter((o) => o.permission === _permission.id).map((o) => o.cid);
                commands = commands.filter((o) => commandIds.includes(String(o._id)));
              } else {
                commands = [];
              }
            }
            return _.size(commands) === 0 ? ' ' : (_.map(commands, (o) => o.command.replace('!', ''))).join(', ');
          case '!command':
            if (permission) {
              const responses = await global.db.engine.find(global.systems.customCommands.collection.responses);
              const _permission = await global.permissions.get(permission);
              if (_permission) {
                const commandIds = responses.filter((o) => o.permission === _permission.id).map((o) => o.cid);
                commands = commands.filter((o) => commandIds.includes(String(o._id)));
              } else {
                commands = [];
              }
            }
            return _.size(commands) === 0 ? ' ' : (_.map(commands, 'command')).join(', ');
          case 'cooldown':
            list = _.map(cooldowns, function (o, k) {
              const time = o.miliseconds;
              return o.key + ': ' + (parseInt(time, 10) / 1000) + 's';
            }).join(', ');
            return list.length > 0 ? list : ' ';
          case 'price':
            list = (await Promise.all(
              _.map(prices, async (o) => {
                return `${o.command} (${o.price}${await global.systems.points.getPointsName(o.price)})`;
              })
            )).join(', ');
            return list.length > 0 ? list : ' ';
          case 'ranks':
            list = _.map(_.orderBy(ranks, 'hours', 'asc'), (o) => {
              return `${o.value} (${o.hours}h)`;
            }).join(', ');
            return list.length > 0 ? list : ' ';
          default:
            global.log.warning('unknown list system ' + system);
            return '';
        }
      }
    };
    let math = {
      '(math.#)': async function (filter) {
        let toEvaluate = filter.replace(/\(math./g, '').replace(/\)/g, '');

        // check if custom variables are here
        const regexp = /(\$_\w+)/g;
        let match = toEvaluate.match(regexp);
        if (match) {
          for (let variable of match) {
            toEvaluate = toEvaluate.replace(
              variable,
              _.get((await global.db.engine.findOne('customvars', { key: variable.replace('$_', '') })), 'value', 0)
            );
          }
        }
        return mathjs.eval(toEvaluate);
      }
    };
    let evaluate = {
      '(eval#)': async function (filter) {
        let toEvaluate = filter.replace('(eval ', '').slice(0, -1);

        const containUsers = !_.isNil(toEvaluate.match(/users/g));
        const containRandom = !_.isNil(toEvaluate.replace(/Math\.random|_\.random/g, '').match(/random/g));
        const containOnline = !_.isNil(toEvaluate.match(/online/g));
        const containUrl = !_.isNil(toEvaluate.match(/url\(['"](.*?)['"]\)/g));

        let urls = [];
        if (containUrl) {
          for (let match of toEvaluate.match(/url\(['"](.*?)['"]\)/g)) {
            const id = 'url' + crypto.randomBytes(64).toString('hex').slice(0, 5);
            const url = match.replace(/url\(['"]|["']\)/g, '');
            let response = await axios.get(url);
            try {
              response.data = JSON.parse(response.data.toString());
            } catch (e) {
              // JSON failed, treat like string
              response = response.data.toString();
            }
            urls.push({ id, response });
            toEvaluate = toEvaluate.replace(match, id);
          }
        }

        let users = [];
        if (containUsers || containRandom) {
          users = await global.users.getAll();
        }
        let user = await global.users.get(attr.sender.username);

        let onlineViewers = [];
        let onlineSubscribers = [];
        let onlineFollowers = [];

        if (containOnline) {
          onlineViewers = await global.db.engine.find('users.online');

          for (let viewer of onlineViewers) {
            let user = await global.db.engine.find('users', { username: viewer.username, is: { subscriber: true } });
            if (!_.isEmpty(user)) {onlineSubscribers.push(user.username)};
          }
          onlineSubscribers = _.filter(onlineSubscribers, function (o) { return o !== attr.sender.username; });

          for (let viewer of onlineViewers) {
            let user = await global.db.engine.find('users', { username: viewer.username, is: { follower: true } });
            if (!_.isEmpty(user)) {onlineFollowers.push(user.username)};
          }
          onlineFollowers = _.filter(onlineFollowers, function (o) { return o !== attr.sender.username; });
        }

        let randomVar = {
          online: {
            viewer: _.sample(_.map(onlineViewers, 'username')),
            follower: _.sample(_.map(onlineFollowers, 'username')),
            subscriber: _.sample(_.map(onlineSubscribers, 'username'))
          },
          viewer: _.sample(_.map(users, 'username')),
          follower: _.sample(_.map(_.filter(users, (o) => _.get(o, 'is.follower', false)), 'username')),
          subscriber: _.sample(_.map(_.filter(users, (o) => _.get(o, 'is.subscriber', false)), 'username'))
        };
        let is = user.is;

        let toEval = `(function evaluation () {  ${toEvaluate} })()`;
        let context = {
          _: _,
          users: users,
          is: is,
          random: randomVar,
          sender: global.tmi.showWithAt ? `@${attr.sender.username}` : `${attr.sender.username}`,
          param: _.isNil(attr.param) ? null : attr.param
        };

        if (containUrl) {
          // add urls to context
          for (let url of urls) {
            context[url.id] = url.response;
          }
        }

        return (safeEval(toEval, context));
      }
    };
    let ifp = {
      '(if#)': async function (filter) {
        // (if $days>2|More than 2 days|Less than 2 days)
        try {
          let toEvaluate = filter
            .replace('(if ', '')
            .slice(0, -1)
            .replace(/\$param|\$!param/g, attr.param); // replace params
          let [check, ifTrue, ifFalse] = toEvaluate.split('|');
          check = check.startsWith('>') || check.startsWith('<') || check.startsWith('=') ? false : check; // force check to false if starts with comparation
          if (_.isNil(ifTrue)) {return};
          if (safeEval(check)) {return ifTrue};
          return _.isNil(ifFalse) ? '' : ifFalse;
        } catch (e) {
          return '';
        }
      }
    };
    let stream = {
      '(stream|#|game)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|game)', '');

        const token = await global.oauth.botAccessToken;
        if (token === '') {return 'n/a'};

        try {
          let request = await axios.get(`https://api.twitch.tv/kraken/users?login=${channel}`, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + token
            }
          });
          const channelId = request.data.users[0]._id;
          request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
              'Authorization': 'Bearer ' + token
            }
          });
          return global.api.getGameFromId(request.data.data[0].game_id);
        } catch (e) { return 'n/a'; } // return nothing on error
      },
      '(stream|#|title)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|title)', '');

        const token = await global.oauth.botAccessToken;
        if (token === '') {return 'n/a'};

        try {
          let request = await axios.get(`https://api.twitch.tv/kraken/users?login=${channel}`, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + token
            }
          });

          const channelId = request.data.users[0]._id;
          request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
              'Authorization': 'Bearer ' + token
            }
          });
          // save remaining api calls
          global.api.calls.bot.remaining = request.headers['ratelimit-remaining'];
          global.api.calls.bot.refresh = request.headers['ratelimit-reset'];
          return request.data.data[0].title;
        } catch (e) { return 'n/a'; } // return nothing on error
      },
      '(stream|#|viewers)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|viewers)', '');

        const token = await global.oauth.botAccessToken;
        if (token === '') {return '0'};

        try {
          let request = await axios.get(`https://api.twitch.tv/kraken/users?login=${channel}`, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + token
            }
          });
          const channelId = request.data.users[0]._id;
          request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
              'Authorization': 'Bearer ' + token
            }
          });
          // save remaining api calls
          global.api.calls.bot.remaining = request.headers['ratelimit-remaining'];
          global.api.calls.bot.refresh = request.headers['ratelimit-reset'];
          return request.data.data[0].viewer_count;
        } catch (e) { return '0'; } // return nothing on error
      }
    };

    await this.global({});

    await this.parseMessageEach(price);
    await this.parseMessageEach(info);
    await this.parseMessageEach(random);
    await this.parseMessageEach(ifp, false);
    await this.parseMessageVariables(custom);
    await this.parseMessageEval(evaluate, decode(this.message));
    await this.parseMessageEach(param, true);
    // local replaces
    if (!_.isNil(attr)) {
      for (let [key, value] of Object.entries(attr)) {
        if (_.includes(['sender'], key)) {
          if (typeof value.username !== 'undefined') {
            value = global.tmi.showWithAt ? `@${value.username}` : value.username;
          } else {
            value = global.tmi.showWithAt ? `@${value}` : value;
          }
        }
        this.message = this.message.replace(new RegExp('[$]' + key, 'g'), value);
      }
    }
    await this.parseMessageEach(math);
    await this.parseMessageOnline(online);
    await this.parseMessageCommand(command);
    await this.parseMessageEach(qs, false);
    await this.parseMessageEach(list);
    await this.parseMessageEach(stream);
    await this.parseMessageApi();

    return this.message;
  }

  async parseMessageApi () {
    if (this.message.trim().length === 0) {return};

    let rMessage = this.message.match(/\(api\|(http\S+)\)/i);
    if (!_.isNil(rMessage) && !_.isNil(rMessage[1])) {
      this.message = this.message.replace(rMessage[0], '').trim(); // remove api command from message
      let url = rMessage[1].replace(/&amp;/g, '&');
      let response = await axios.get(url);
      if (response.status !== 200) {
        return global.translate('core.api.error');
      }

      // search for api datas in this.message
      let rData = this.message.match(/\(api\.(?!_response)(\S*?)\)/gi);
      if (_.isNil(rData)) {
        if (_.isObject(response.data)) {
          // Stringify object
          this.message = this.message.replace('(api._response)', JSON.stringify(response.data));
        } else {this.message = this.message.replace('(api._response)', response.data.toString().replace(/^"(.*)"/, '$1'))};
      } else {
        if (_.isBuffer(response.data)) {response.data = JSON.parse(response.data.toString())};
        for (let tag of rData) {
          let path = response.data;
          let ids = tag.replace('(api.', '').replace(')', '').split('.');
          _.each(ids, function (id) {
            let isArray = id.match(/(\S+)\[(\d+)\]/i);
            if (isArray) {
              path = path[isArray[1]][isArray[2]];
            } else {
              path = path[id];
            }
          });
          this.message = this.message.replace(tag, !_.isNil(path) ? path : global.translate('core.api.not-available'));
        }
      }
    }
  }

  async parseMessageCommand (filters) {
    if (this.message.trim().length === 0) {return};
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) {continue};

      let fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '.*?');
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          this.message = this.message.replace(rMessage[bkey], await fnc(rMessage[bkey])).trim();
        }
      }
    }
  }

  async parseMessageOnline (filters) {
    if (this.message.trim().length === 0) {return};
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) {continue};

      let fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '(\\S+)');
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          if (!(await fnc(rMessage[bkey]))) {
            this.message = '';
          } else {
            this.message = this.message.replace(rMessage[bkey], '').trim();
          }
        }
      }
    }
  }

  async parseMessageEval (filters) {
    if (this.message.trim().length === 0) {return};
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) {continue};

      let fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '([\\S ]+)');
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          let newString = await fnc(rMessage[bkey]);
          if (_.isUndefined(newString) || newString.length === 0) {this.message = ''};
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  async parseMessageVariables (filters, removeWhenEmpty) {
    if (_.isNil(removeWhenEmpty)) {removeWhenEmpty = true};

    if (this.message.trim().length === 0) {return};
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) {continue};

      let fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      regexp = regexp.replace(/#/g, '([a-zA-Z0-9_]+)');
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          let newString = await fnc(rMessage[bkey]);
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {this.message = ''};
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  async parseMessageEach (filters, removeWhenEmpty) {
    if (_.isNil(removeWhenEmpty)) {removeWhenEmpty = true};

    if (this.message.trim().length === 0) {return};
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) {continue};

      let fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      if (key.startsWith('$')) {
        regexp = regexp.replace(/#/g, '(\\b.+?\\b)');
      } else {
        regexp = regexp.replace(/#/g, '([\\S ]+?)'); // default behavior for if
      }
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          let newString = await fnc(rMessage[bkey]);
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {this.message = ''};
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }
}

module.exports = Message;
