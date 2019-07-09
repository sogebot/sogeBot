'use strict'

const moment = require('moment')
const {
  isMainThread
} = require('worker_threads');
const _ = require('lodash')
const TwitchJs = require('twitch-js').default
const Parser = require('./parser')
const util = require('util');
const commons = require('./commons');

import { command, default_permission } from './decorators';
import { permission } from './permissions';
const Expects = require('./expects')
import Core from './_interface'
const constants = require('./constants')
import { settings, ui } from './decorators';
import { globalIgnoreList } from './data/globalIgnoreList';

const __DEBUG__ =
  (process.env.DEBUG && process.env.DEBUG.includes('tmi.client'));

class TMI extends Core {
  @settings('chat')
  sendWithMe = false;

  @settings('chat')
  ignorelist = [];

  @settings('chat')
  @ui({ type: 'global-ignorelist-exclude', values: globalIgnoreList }, 'chat')
  globalIgnoreListExclude = [];

  @settings('chat')
  showWithAt = true;

  @settings('chat')
  mute = false;

  @settings('chat')
  whisperListener = false;

  channel: string = ''
  timeouts: Object = {}
  client: Object = {}
  lastWorker: string = ''
  broadcasterWarning: boolean = false

  ignoreGiftsFromUser: { [string]: { count: number, time: Date }} = {}

  constructor () {
    super()

    this.addMenu({ category: 'settings', name: 'core', id: 'core' })

    if (isMainThread) {
      global.status.TMI = constants.DISCONNECTED
    }
  }

  @command('!ignore add')
  @default_permission(permission.CASTERS)
  async ignoreAdd (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()
      global.tmi.ignorelist = [
        ...new Set([
          ...global.tmi.ignorelist,
          username,
        ]
      )];
      // update ignore list
      commons.sendMessage(commons.prepare('ignore.user.is.added', { username }), opts.sender)
    } catch (e) {
      global.log.error(e.message)
    }
  }

  @command('!ignore remove')
  @default_permission(permission.CASTERS)
  async ignoreRm (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()
      global.tmi.ignorelist = global.tmi.ignorelist.filter(o => o !== username)
      // update ignore list
      commons.sendMessage(commons.prepare('ignore.user.is.removed', { username }), opts.sender)
    } catch (e) {
      global.log.error(e.message)
    }
  }

  @command('!ignore check')
  @default_permission(permission.CASTERS)
  async ignoreCheck (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()
      const isUserIgnored = await commons.isIgnored({ username });
      commons.sendMessage(commons.prepare(isUserIgnored ? 'ignore.user.is.ignored' : 'ignore.user.is.not.ignored', { username }), opts.sender)
      return isUserIgnored
    } catch (e) {}
  }

  async initClient (type: string) {
    clearTimeout(this.timeouts[`initClient.${type}`])
    const [token, username, channel] = await Promise.all([
      global.oauth[type + 'AccessToken'],
      global.oauth[type + 'Username'],
      global.oauth.generalChannel
    ])

    try {
      if (token === '' || username === '' || channel === '') throw Error(`${type} - token, username or channel expected`)
      const log = __DEBUG__ ? null : { level: 0 };
      this.client[type] = new TwitchJs({
        token,
        username,
        log,
        onAuthenticationFailure: () => global.oauth.refreshAccessToken(type).then(token => token)
      })
      this.loadListeners(type)
      await this.client[type].chat.connect()
      await this.join(type, channel)
    } catch (e) {
      if (type === 'broadcaster' && !this.broadcasterWarning) {
        global.log.error('Broadcaster oauth is not properly set - hosts will not be loaded')
        global.log.error('Broadcaster oauth is not properly set - subscribers will not be loaded')
        this.broadcasterWarning = true
      }
      this.timeouts[`initClient.${type}`] = setTimeout(() => this.initClient(type), 10000)
    }
  }

  /* will connect/reconnect bot and broadcaster
   * this is called from oauth when channel is changed or initialized
   */
  async reconnect (type: string) {
    try {
      if (typeof this.client[type] === 'undefined') throw Error('TMI: cannot reconnect, connection is not established')
      const [token, username, channel] = await Promise.all([
        global.oauth[type + 'AccessToken'],
        global.oauth[type + 'Username'],
        global.oauth.generalChannel
      ])

      if (this.channel !== channel) {
        global.log.info(`TMI: ${type} is reconnecting`)

        await this.client[type].chat.part(this.channel)
        await this.client[type].chat.reconnect({ token, username, onAuthenticationFailure: () => global.oauth.refreshAccessToken(type).then(token => token) })

        await this.join(type, channel)
      }
    } catch (e) {
      this.initClient(type) // connect properly
    }
  }

  async join (type: string, channel: string) {
    if (typeof this.client[type] === 'undefined') {
      global.log.info(`TMI: ${type} oauth is not properly set, cannot join`)
    } else {
      if (channel === '') {
        global.log.info(`TMI: ${type} is not properly set, cannot join empty channel`)
      } else {
        await this.client[type].chat.join(channel)
        global.log.info(`TMI: ${type} joined channel ${channel}`)
        this.channel = channel;
      }
    }
  }

  async part (type: string) {
    if (typeof this.client[type] === 'undefined') {
      global.log.info(`TMI: ${type} is not connected in any channel`)
    } else {
      await this.client[type].chat.part(this.channel)
      global.log.info(`TMI: ${type} parted channel ${this.channel}`)
    }
  }

  getUsernameFromRaw (raw: string) {
    const match = raw.match(/@([a-z_0-9]*).tmi.twitch.tv/)
    if (match) return match[1]
    else return null
  }

  loadListeners (type: string) {
    // common for bot and broadcaster
    this.client[type].chat.on('DISCONNECT', async (message) => {
      global.log.info(`TMI: ${type} is disconnected`)
      global.status.TMI = constants.DISCONNECTED
      // go through all systems and trigger on.partChannel
      for (let [/* type */, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations
      })) {
        for (let [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') {
            continue;
          }
          if (Array.isArray(system.on.partChannel)) {
            for (const fnc of system.on.partChannel) {
              system[fnc]();
            }
          }
        }
      }
    })
    this.client[type].chat.on('RECONNECT', async (message) => {
      global.log.info(`TMI: ${type} is reconnecting`)
      global.status.TMI = constants.RECONNECTING
      // go through all systems and trigger on.reconnectChannel
      for (let [/* type */, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations
      })) {
        for (let [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') {
            continue;
          }
          if (Array.isArray(system.on.reconnectChannel)) {
            for (const fnc of system.on.reconnectChannel) {
              system[fnc]();
            }
          }
        }
      }
    })
    this.client[type].chat.on('CONNECTED', async (message) => {
      global.log.info(`TMI: ${type} is connected`)
      global.status.TMI = constants.CONNECTED
      // go through all systems and trigger on.joinChannel
      for (let [/* type */, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations
      })) {
        for (let [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') {
            continue;
          }
          if (Array.isArray(system.on.joinChannel)) {
            for (const fnc of system.on.joinChannel) {
              system[fnc]();
            }
          }
        }
      }
    })

    if (type === 'bot') {
      this.client[type].chat.on('WHISPER', async (message) => {
        message.tags.username = this.getUsernameFromRaw(message._raw)

        if (!commons.isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = 'whisper'
          global.tmi.message({message})
          global.linesParsed++
        }
      })

      this.client[type].chat.on('PRIVMSG', async (message) => {
        message.tags.username = this.getUsernameFromRaw(message._raw)

        if (!commons.isBot(message.tags.username) || !message.isSelf) {
          message.tags['message-type'] = message.message.startsWith('\u0001ACTION') ? 'action' : 'say' // backward compatibility for /me moderation

          if (message.event === 'CHEER') {
            this.cheer(message)
          } else {
            // strip message from ACTION
            message.message = message.message.replace('\u0001ACTION ', '').replace('\u0001', '')
            global.tmi.message({message})
            global.linesParsed++

            // go through all systems and trigger on.message
            for (let [type, systems] of Object.entries({
              systems: global.systems,
              games: global.games,
              overlays: global.overlays,
              widgets: global.widgets,
              integrations: global.integrations
            })) {
              for (let [name, system] of Object.entries(systems)) {
                if (name.startsWith('_') || typeof system.on === 'undefined') continue
                if (Array.isArray(system.on.message)) {
                  for (const fnc of system.on.message) {
                    system[fnc]({
                      sender: message.tags,
                      message: message.message,
                      timestamp: _.now()
                    })
                  }
                }
              }
            }

            if (message.tags['message-type'] === 'action') global.events.fire('action', { username: message.tags.username.toLowerCase() })
          }
        } else {
          global.status.MOD = typeof message.tags.badges.moderator !== 'undefined'
        }
      })

      this.client[type].chat.on('CLEARCHAT', message => {
        if (message.event === 'USER_BANNED') {
          const duration = message.tags.banDuration
          const reason = message.tags.banReason
          const username = message.username.toLowerCase()

          if (typeof duration === 'undefined') {
            global.log.ban(`${username}, reason: ${reason}`)
            global.events.fire('ban', { username: username, reason: reason })
          } else {
            global.events.fire('timeout', { username, reason, duration })
          }
        } else {
          global.events.fire('clearchat')
        }
      })

      this.client[type].chat.on('HOSTTARGET', message => {
        if (message.event === 'HOST_ON') {
          if (typeof message.numberOfViewers !== 'undefined') { // may occur on restart bot when hosting
            global.events.fire('hosting', { target: message.username, viewers: message.numberOfViewers })
          }
        }
      })

      this.client[type].chat.on('USERNOTICE', message => {
        if (message.event === 'RAID') {
          global.log.raid(`${message.parameters.login}, viewers: ${message.parameters.viewerCount}`)
          global.db.engine.update('cache.raids', { username: message.parameters.login }, { username: message.parameters.login })

          const data = {
            username: message.parameters.login,
            viewers: message.parameters.viewerCount,
            type: 'raid'
          }

          global.overlays.eventlist.add(data)
          global.events.fire('raided', data)
        } else if (message.event === 'SUBSCRIPTION') {
          this.subscription(message)
        } else if (message.event === 'RESUBSCRIPTION') {
          this.resub(message)
        } else if (message.event === 'SUBSCRIPTION_GIFT') {
          this.subgift(message)
        } else if (message.event === 'SUBSCRIPTION_GIFT_COMMUNITY') {
          this.subscriptionGiftCommunity(message)
        } else if (message.event === 'RITUAL') {
          if (message.parameters.ritualName === 'new_chatter') {
            if (!global.users.newChattersList.includes(message.tags.username.toLowerCase())) {
              global.users.newChattersList.push(message.tags.username.toLowerCase())
              global.db.engine.increment('api.new', { key: 'chatters' }, { value: 1 })
            }
          } else {
            global.log.info('Unknown RITUAL')
          }
        } else {
          global.log.info('Unknown USERNOTICE')
          global.log.info(JSON.stringify(message))
        }
      })

      this.client[type].chat.on('NOTICE', message => {
        global.log.info(message.message)
      })
    } else if (type === 'broadcaster') {
      this.client[type].chat.on('PRIVMSG/HOSTED', async (message) => {
        // Someone is hosting the channel and the message contains how many viewers..
        const username = message.message.split(' ')[0].replace(':', '').toLowerCase()
        const autohost = message.message.includes('auto')
        let viewers = message.numberOfViewers || '0'

        global.log.host(`${username}, viewers: ${viewers}, autohost: ${autohost}`)
        global.db.engine.update('cache.hosts', { username }, { username })

        const data = {
          username: username,
          viewers: viewers,
          autohost: autohost,
          type: 'host'
        }

        global.overlays.eventlist.add(data)
        global.events.fire('hosted', data)
      })
    } else {
      throw Error(`This ${type} is not supported`)
    }
  }

  async subscription (message: Object) {
    try {
      const username = message.tags.login
      const subCumulativeMonths = Number(message.parameters.cumulativeMonths)
      const method = this.getMethod(message)
      const tier = method.prime ? 'Prime' : method.plan / 1000;
      const userstate = message.tags

      if (await commons.isIgnored({username, userId: userstate.userId})) return

      const user = await global.db.engine.findOne('users', { id: userstate.userId })
      let subscribedAt = _.now()
      let isSubscriber = true

      if (user.lock && user.lock.subscribed_at) subscribedAt = undefined
      if (user.lock && user.lock.subscriber) isSubscriber = undefined

      await global.users.setById(userstate.userId, { username, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt }, stats: { subStreak: 1, subCumulativeMonths, tier } });
      global.overlays.eventlist.add({ type: 'sub', tier, username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '' })
      global.log.sub(`${username}#${userstate.userId}, tier: ${tier}`)
      global.events.fire('subscription', { username: username, method: (!_.isNil(method.prime) && method.prime) ? 'Twitch Prime' : '', subCumulativeMonths, tier });
      // go through all systems and trigger on.sub
      for (let [type, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations
      })) {
        for (let [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') continue
          if (Array.isArray(system.on.sub)) {
            for (const fnc of system.on.sub) {
              system[fnc]({
                username: username,
                userId: userstate.userId,
                subCumulativeMonths
              });
            }
          }
        }
      }
    } catch (e) {
      global.log.error('Error parsing subscription event')
      global.log.error(util.inspect(message))
      global.log.error(e.stack)
    }
  }

  async resub (message: Object) {
    try {
      const username = message.tags.login
      const method = this.getMethod(message)
      const subCumulativeMonths = Number(message.parameters.cumulativeMonths)
      const subStreakShareEnabled = Number(message.parameters.shouldShareStreak) !== 0
      const streakMonths = Number(message.parameters.streakMonths)
      const userstate = message.tags
      const messageFromUser = message.message
      const tier = method.prime ? 'Prime' : method.plan / 1000

      if (await commons.isIgnored({username, userId: userstate.userId})) return

      const user = await global.db.engine.findOne('users', { id: userstate.userId })

      let subscribed_at = subStreakShareEnabled ? Number(moment().subtract(streakMonths, 'months').format('X')) * 1000 : undefined;
      let subStreak = subStreakShareEnabled ? streakMonths : 0;
      let isSubscriber = true

      if (user.lock && user.lock.subscribed_at) subscribed_at = undefined
      if (user.lock && user.lock.subscriber) isSubscriber = undefined

      await global.users.setById(userstate.userId, { username, id: userstate.userId, is: { subscriber: isSubscriber }, time: { subscribed_at }, stats: { subStreak, subCumulativeMonths, tier } })

      global.overlays.eventlist.add({
        type: 'resub',
        tier,
        username,
        subStreakShareEnabled,
        subStreak,
        subStreakName: commons.getLocalizedName(subStreak, 'core.months'),
        subCumulativeMonths,
        subCumulativeMonthsName: commons.getLocalizedName(subCumulativeMonths, 'core.months'),
        message: messageFromUser
      });
      global.log.resub(`${username}#${userstate.userId}, streak share: ${subStreakShareEnabled}, streak: ${subStreak}, months: ${subCumulativeMonths}, message: ${messageFromUser}, tier: ${tier}`)
      global.events.fire('resub', {
        username,
        tier,
        subStreakShareEnabled,
        subStreak,
        subStreakName: commons.getLocalizedName(subStreak, 'core.months'),
        subCumulativeMonths,
        subCumulativeMonthsName: commons.getLocalizedName(subCumulativeMonths, 'core.months'),
        message: messageFromUser
      })
    } catch (e) {
      global.log.error('Error parsing resub event')
      global.log.error(util.inspect(message))
      global.log.error(e.stack)
    }
  }

  async subscriptionGiftCommunity (message: Object) {
    try {
      const username = message.tags.login
      const userId = message.tags.userId
      const count = Number(message.parameters.massGiftCount)

      // save total count, userId
      await global.db.engine.update('users', { id: userId }, { username, custom: { subgiftCount: Number(message.parameters.senderCount) } })

      this.ignoreGiftsFromUser[username] = { count, time: new Date() }

      if (await commons.isIgnored({username, userId: userstate.userId})) return

      global.overlays.eventlist.add({ type: 'subcommunitygift', username, count })
      global.events.fire('subcommunitygift', { username, count })
      global.log.subcommunitygift(`${username}#${userId}, to ${count} viewers`)
    } catch (e) {
      global.log.error('Error parsing subscriptionGiftCommunity event')
      global.log.error(util.inspect(message))
      global.log.error(e.stack)
    }
  }

  async subgift (message: Object) {
    try {
      const username = message.tags.login;
      const subCumulativeMonths = Number(message.parameters.months);
      const recipient = message.parameters.recipientUserName.toLowerCase();
      const recipientId = message.parameters.recipientId;
      const tier = this.getMethod(message).plan / 1000;


      // update recipient ID
      await global.db.engine.update('users', { id: recipientId }, { username: recipient })
      // update gifter ID
      await global.db.engine.update('users', { id: message.tags.userId }, { username })

      for (let [u, o] of Object.entries(this.ignoreGiftsFromUser)) {
        // $FlowFixMe Incorrect mixed type from value of Object.entries https://github.com/facebook/flow/issues/5838
        if (o.count === 0 || new Date().getTime() - new Date(o.time).getTime() >= 1000 * 60 * 10) {
          delete this.ignoreGiftsFromUser[u]
        }
      }

      if (typeof this.ignoreGiftsFromUser[username] !== 'undefined' && this.ignoreGiftsFromUser[username].count !== 0) {
        this.ignoreGiftsFromUser[username].count--
      } else {
        global.events.fire('subgift', { username: username, recipient: recipient, tier })
        // go through all systems and trigger on.sub
        for (let [type, systems] of Object.entries({
          systems: global.systems,
          games: global.games,
          overlays: global.overlays,
          widgets: global.widgets,
          integrations: global.integrations
        })) {
          for (let [name, system] of Object.entries(systems)) {
            if (name.startsWith('_') || typeof system.on === 'undefined') continue
            if (typeof system.on.sub === 'function') {
              system.on.sub({
                username: recipient,
                userId: recipientId,
              })
            }
          }
        }
      }
      if (await commons.isIgnored({username, userId: userstate.userId})) return

      let user = await global.db.engine.findOne('users', { id: recipientId })
      if (!user.id) user.id = recipientId

      let subscribedAt = _.now()
      let isSubscriber = true

      if (user.lock && user.lock.subscribed_at) subscribedAt = undefined
      if (user.lock && user.lock.subscriber) isSubscriber = undefined

      await global.users.setById(user.id, { username: recipient, is: { subscriber: isSubscriber }, time: { subscribed_at: subscribedAt }, stats: { subCumulativeMonths, tier } })
      await global.db.engine.increment('users', { id: user.id }, { stats: { subStreak: 1 }})
      global.overlays.eventlist.add({ type: 'subgift', username: recipient, from: username, monthsName: commons.getLocalizedName(subCumulativeMonths, 'core.months'), months: subCumulativeMonths })
      global.log.subgift(`${recipient}#${recipientId}, from: ${username}, months: ${subCumulativeMonths}`)

      // also set subgift count to gifter
      if (!(await commons.isIgnored({username, userId: user.id}))) {
        await global.db.engine.increment('users', { id: message.tags.userId }, { custom: { subgiftCount: 1 } })
      }
    } catch (e) {
      global.log.error('Error parsing subgift event')
      global.log.error(util.inspect(message))
      global.log.error(e.stack)
    }
  }

  async cheer (message: Object) {
    try {
      const username = message.tags.username
      const userId = message.tags.userId
      const userstate = message.tags
      // remove <string>X or <string>X from message, but exclude from remove #<string>X
      const messageFromUser = message.message.replace(/(?<!#)(\b\w+[\d]+\b)/g, '').trim()

      if (await commons.isIgnored({username: userstate.username, userId: userstate.userId})) return

      // update users ID
      await global.db.engine.update('users', { id: userId }, { username })

      global.overlays.eventlist.add({ type: 'cheer', username, bits: userstate.bits, message: messageFromUser })
      global.log.cheer(`${username}#${userId}, bits: ${userstate.bits}, message: ${messageFromUser}`)
      global.db.engine.insert('users.bits', { id: userId, amount: Number(userstate.bits), message: messageFromUser, timestamp: _.now() })
      global.events.fire('cheer', { username, bits: userstate.bits, message: messageFromUser })
      if (await global.cache.isOnline()) await global.db.engine.increment('api.current', { key: 'bits' }, { value: parseInt(userstate.bits, 10) })

      // go through all systems and trigger on.bit
      for (let [type, systems] of Object.entries({
        systems: global.systems,
        games: global.games,
        overlays: global.overlays,
        widgets: global.widgets,
        integrations: global.integrations
      })) {
        for (let [name, system] of Object.entries(systems)) {
          if (name.startsWith('_') || typeof system.on === 'undefined') continue
          if (Array.isArray(system.on.bit)) {
            for (const fnc of system.on.bit) {
              system[fnc]({
                username: username,
                amount: userstate.bits,
                message: messageFromUser,
                timestamp: _.now()
              });
            }
          }
        }
      }
    } catch (e) {
      global.log.error('Error parsing cheer event')
      global.log.error(util.inspect(message))
      global.log.error(e.stack)
    }
  }

  getMethod (message: Object) {
    return {
      plan: message.parameters.subPlan === 'Prime' ? 1000 : message.parameters.subPlan,
      prime: message.parameters.subPlan === 'Prime' ? 'Prime' : false
    }
  }

  delete (client: 'broadcaster' | 'bot', msgId: string): void {
    if (!isMainThread) {
      global.workers.sendToMaster({
        type: 'call',
        ns: 'tmi',
        fnc: 'delete',
        args: [client, msgId],
      })
    } else {
      this.client[client].chat.say(commons.getOwner(), '/delete ' + msgId)
    }
  }

  async message (data) {
    if (isMainThread && !global.mocha) {
      return global.workers.sendToWorker({
        type: 'call',
        ns: 'tmi',
        fnc: 'message',
        args: [data],
      })
    }

    let sender = data.message.tags;
    let message = data.message.message;
    let skip = data.skip;
    let quiet = data.quiet;

    if (!sender.userId && sender.username) {
      // this can happen if we are sending commands from dashboards etc.
      sender.userId = await global.users.getIdByName(sender.username);
    }

    if (typeof sender.badges === 'undefined') {
      sender.badges = {}
    }

    const parse = new Parser({ sender: sender, message: message, skip: skip, quiet: quiet })

    if (!skip
        && sender['message-type'] === 'whisper'
        && (global.tmi.whisperListener || isOwner(sender))) {
      global.log.whisperIn(message, { username: sender.username })
    } else if (!skip && !commons.isBot(sender.username)) {
      global.log.chatIn(message, { username: sender.username })
    }

    const isModerated = await parse.isModerated()
    const isIgnored = await commons.isIgnored(sender)
    if (!isModerated && !isIgnored) {
      if (!skip && !_.isNil(sender.username)) {
        const subCumulativeMonths = function(senderObj) {
          if (typeof senderObj.badgeInfo === 'string' && senderObj.badgeInfo.includes('subscriber')) {
            const match = senderObj.badgeInfo.match(/subscriber\/(\d+)/)
            if (match) {
              return Number(match[1]);
            }
          }
          return undefined; // undefined will not change any values
        }
        let user = await global.db.engine.findOne('users', { id: sender.userId })
        let data = {
          id: sender.userId,
          is: {
            subscriber: (user.lock && user.lock.subscriber ? undefined : typeof sender.badges.subscriber !== 'undefined'),
            moderator: typeof sender.badges.moderator !== 'undefined',
            vip: typeof sender.badges.vip !== 'undefined',
          },
          stats: {
            subCumulativeMonths: subCumulativeMonths(sender),
          },
          username: sender.username
        }

        // mark user as online
        await global.db.engine.update('users.online', { username: sender.username }, { username: sender.username })

        if (_.get(sender, 'badges.subscriber', 0)) _.set(data, 'stats.tier', 0) // unset tier if sender is not subscriber

        // update user based on id not username
        await global.db.engine.update('users', { id: String(sender.userId) }, data)

        if (isMainThread) {
          global.api.isFollower(sender.username)
        } else {
          global.workers.sendToMaster({ type: 'api', fnc: 'isFollower', username: sender.username })
        }

        if (await global.cache.isOnline()) {
          global.events.fire('keyword-send-x-times', { username: sender.username, message: message })
          if (message.startsWith('!')) {
            global.events.fire('command-send-x-times', { username: sender.username, message: message })
          } else if (!message.startsWith('!')) {
            global.db.engine.increment('users.messages', { id: sender.userId }, { messages: 1 })
          }
        }
      }
      await parse.process();
    }
    this.avgResponse({ value: parse.time(), message })
  }

  avgResponse(opts) {
    if (!isMainThread) {
      return global.workers.sendToMaster({
        type: 'call',
        ns: 'tmi',
        fnc: 'avgResponse',
        args: [opts],
      })
    }
    let avgTime = 0
    global.avgResponse.push(opts.value)
    if (opts.value > 1000) global.log.warning(`Took ${opts.value}ms to process: ${opts.message}`)
    if (global.avgResponse.length > 100) global.avgResponse.shift()
    for (let time of global.avgResponse) avgTime += parseInt(time, 10)
    global.status['RES'] = (avgTime / global.avgResponse.length).toFixed(0)
  }
}

module.exports = TMI
