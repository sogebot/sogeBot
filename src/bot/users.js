// @flow

'use strict'

var _ = require('lodash')
var constants = require('./constants')
const cluster = require('cluster')
const axios = require('axios')

const Expects = require('./expects')
const Core = require('./_interface')

class Users extends Core {
  uiSortCache: String | null = null
  uiSortCacheViewers: Array<Object> = []
  newChattersList: Array<string> = []

  constructor () {
    const settings = {
      commands: [
        { name: '!regular add', fnc: 'addRegular', permission: constants.OWNER_ONLY },
        { name: '!regular remove', fnc: 'rmRegular', permission: constants.OWNER_ONLY },
        { name: '!ignore add', fnc: 'ignoreAdd', permission: constants.OWNER_ONLY },
        { name: '!ignore rm', fnc: 'ignoreRm', permission: constants.OWNER_ONLY },
        { name: '!ignore check', fnc: 'ignoreCheck', permission: constants.OWNER_ONLY },
        { name: '!me', fnc: 'showMe', permission: constants.VIEWERS }
      ]
    }

    super({ settings })

    this.addMenu({ category: 'manage', name: 'viewers', id: 'viewers/list' })
    this.addMenu({ category: 'settings', name: 'core', id: 'core' })

    if (cluster.isMaster) {
      this.compactMessagesDb()
      this.compactWatchedDb()
      this.updateWatchTime()

      // set all users offline on start
      global.db.engine.remove('users.online', {})
    }
  }

  async ignoreAdd (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()
      await global.db.engine.update('users_ignorelist', { username }, { username })
      // update ignore list
      global.commons.processAll({ ns: 'commons', fnc: 'loadIgnoreList' })
      global.commons.sendMessage(global.commons.prepare('ignore.user.is.added', { username }), opts.sender)
    } catch (e) {}
  }

  async ignoreRm (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()
      await global.db.engine.remove('users_ignorelist', { username })
      // update ignore list
      global.commons.processAll({ ns: 'commons', fnc: 'loadIgnoreList' })
      global.commons.sendMessage(global.commons.prepare('ignore.user.is.removed', { username }), opts.sender)
    } catch (e) {}
  }

  async ignoreCheck (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()
      const isIgnored = await global.commons.isIgnored(username)
      global.commons.sendMessage(global.commons.prepare(isIgnored ? 'ignore.user.is.ignored' : 'ignore.user.is.not.ignored', { username }), opts.sender)
      return isIgnored
    } catch (e) {}
  }

  async get (username: string) {
    console.warn('Deprecated: users.get, use getById or getByName')
    console.warn(new Error().stack)
    return this.getByName(username)
  }

  async getByName (username: string) {
    username = username.toLowerCase()

    let user = await global.db.engine.findOne('users', { username })

    user.username = _.get(user, 'username', username).toLowerCase()
    user.time = _.get(user, 'time', {})
    user.is = _.get(user, 'is', {})
    user.stats = _.get(user, 'stats', {})
    user.custom = _.get(user, 'custom', {})

    try {
      if (!_.isNil(user._id)) user._id = user._id.toString() // force retype _id
      if (_.isNil(user.time.created_at) && !_.isNil(user.id)) { // this is accessing master (in points) and worker
        if (cluster.isMaster) global.api.fetchAccountAge(username, user.id)
        else if (process.send) process.send({ type: 'api', fnc: 'fetchAccountAge', username: username, id: user.id })
      }
    } catch (e) {
      global.log.error(e.stack)
    }
    return user
  }

  async getById (id: string) {
    const user = await global.db.engine.findOne('users', { id })
    user.id = _.get(user, 'id', id)
    user.time = _.get(user, 'time', {})
    user.is = _.get(user, 'is', {})
    user.stats = _.get(user, 'stats', {})
    user.custom = _.get(user, 'custom', {})

    try {
      if (!_.isNil(user._id)) user._id = user._id.toString() // force retype _id
      if (_.isNil(user.time.created_at) && !_.isNil(user.username)) { // this is accessing master (in points) and worker
        if (cluster.isMaster) global.api.fetchAccountAge(user.username, user.id)
        else if (process.send) process.send({ type: 'api', fnc: 'fetchAccountAge', username: user.username, id: user.id })
      }
    } catch (e) {
      global.log.error(e.stack)
    }
    return user
  }

  async getAll (where: Object) {
    where = where || {}
    return global.db.engine.find('users', where)
  }

  async addRegular (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()

      const udb = await global.db.engine.findOne('users', { username })
      if (_.isEmpty(udb)) global.commons.sendMessage(global.commons.prepare('regulars.add.undefined', { username }), opts.sender)
      else {
        global.commons.sendMessage(global.commons.prepare('regulars.add.success', { username }), opts.sender)
        await global.db.engine.update('users', { _id: String(udb._id) }, { is: { regular: true } })
      }
    } catch (e) {
      global.commons.sendMessage(global.commons.prepare('regulars.add.empty'), opts.sender)
    }
  }

  async rmRegular (opts: Object) {
    try {
      const username = new Expects(opts.parameters).username().toArray()[0].toLowerCase()

      const udb = await global.db.engine.findOne('users', { username })
      if (_.isEmpty(udb)) global.commons.sendMessage(global.commons.prepare('regulars.rm.undefined', { username }), opts.sender)
      else {
        global.commons.sendMessage(global.commons.prepare('regulars.rm.success', { username }), opts.sender)
        await global.db.engine.update('users', { _id: String(udb._id) }, { is: { regular: false } })
      }
    } catch (e) {
      global.commons.sendMessage(global.commons.prepare('regulars.rm.empty'), opts.sender)
    }
  }

  async set (username: string, object: Object) {
    if (_.isNil(username)) return global.log.error('username is NULL!\n' + new Error().stack)

    username = username.toLowerCase()
    if (username === global.commons.cached.bot.toLowerCase() || _.isNil(username)) return // it shouldn't happen, but there can be more than one instance of a bot

    const user = await global.db.engine.findOne('users', { username })
    object.username = username
    if (_.isEmpty(user)) {
      const id = await global.api.getIdFromTwitch(username)
      if (id !== null) {
        return global.db.engine.update('users', { id }, object)
      } else return null
    } else return global.db.engine.update('users', { id: user.id }, object)
  }

  async checkNewChatter (id: string, username: string) {
    let watched = await this.getWatchedOf(id)
    // add user as a new chatter in a stream
    if (watched === 0 && !this.newChattersList.includes(username)) {
      await global.db.engine.increment('api.new', { key: 'chatters' }, { value: 1 })
      this.newChattersList.push(username.toLowerCase())
    }
  }

  async updateWatchTime () {
    clearTimeout(this.timeouts['updateWatchTime'])

    let timeout = 60000
    try {
      // count watching time when stream is online
      if (await global.cache.isOnline()) {
        let users = await global.db.engine.find('users.online')
        let updated = []
        for (let onlineUser of users) {
          const isNewUser = typeof this.watchedList[onlineUser.username] === 'undefined'
          updated.push(onlineUser.username)
          const watched = isNewUser ? timeout : new Date().getTime() - new Date(this.watchedList[onlineUser.username]).getTime()
          const id = await global.users.getIdByName(onlineUser.username)
          if (isNewUser) this.checkNewChatter(id, onlineUser.username)
          await global.db.engine.insert('users.watched', { id, watched })
          this.watchedList[onlineUser.username] = new Date()
        }

        // remove offline users from watched list
        for (let u of Object.entries(this.watchedList)) {
          if (!updated.includes(u[0])) delete this.watchedList[u[0]]
        }
      } else {
        global.users.newChattersList = []
        throw Error('stream offline')
      }
    } catch (e) {
      this.watchedList = {}
      timeout = 1000
    }
    this.timeouts['updateWatchTime'] = setTimeout(() => this.updateWatchTime(), timeout)
  }

  async compactWatchedDb () {
    clearTimeout(this.timeouts['compactWatchedDb'])
    try {
      await global.commons.compactDb({ table: 'users.watched', index: 'id', values: 'watched' })
    } catch (e) {
      global.log.error(e)
      global.log.error(e.stack)
    } finally {
      this.timeouts['compactWatchedDb'] = setTimeout(() => this.compactWatchedDb(), 10000)
    }
  }

  async getWatchedOf (id: string) {
    let watched = 0
    for (let item of await global.db.engine.find('users.watched', { id })) {
      let itemPoints = !_.isNaN(parseInt(_.get(item, 'watched', 0))) ? _.get(item, 'watched', 0) : 0
      watched = watched + Number(itemPoints)
    }
    if (Number(watched) < 0) watched = 0

    return parseInt(
      Number(watched) <= Number.MAX_SAFE_INTEGER / 1000000
        ? watched
        : Number.MAX_SAFE_INTEGER / 1000000, 10)
  }

  async compactMessagesDb () {
    clearTimeout(this.timeouts['compactMessagesDb'])

    try {
      await global.commons.compactDb({ table: 'users.messages', index: 'id', values: 'messages' })
    } catch (e) {
      global.log.error(e)
      global.log.error(e.stack)
    } finally {
      this.timeouts['compactMessagesDb'] = setTimeout(() => this.compactMessagesDb(), 10000)
    }
  }

  async getMessagesOf (id: string) {
    let messages = 0
    for (let item of await global.db.engine.find('users.messages', { id })) {
      let itemPoints = !_.isNaN(parseInt(_.get(item, 'messages', 0))) ? _.get(item, 'messages', 0) : 0
      messages = messages + Number(itemPoints)
    }
    if (Number(messages) < 0) messages = 0

    return parseInt(
      Number(messages) <= Number.MAX_SAFE_INTEGER / 1000000
        ? messages
        : Number.MAX_SAFE_INTEGER / 1000000, 10)
  }

  async getUsernamesFromIds (IdsList: Array<string>) {
    let IdsToUsername = {}
    for (let id of IdsList) {
      if (!_.isNil(IdsToUsername[id])) continue // skip if already had map
      IdsToUsername[id] = (await global.db.engine.findOne('users', { id })).username
    }
    return IdsToUsername
  }

  async getNameById (id: string) {
    return (await global.db.engine.findOne('users', { id })).username
  }

  async getIdByName (username: string) {
    let id = (await global.db.engine.findOne('users', { username })).id
    if (typeof id === 'undefined' || id === 'null') {
      id = await global.api.getIdFromTwitch(username)
      await global.db.engine.update('users', { id }, { username })
    }
    return id
  }

  async showMe (opts: Object) {
    try {
      var message = ['$sender']

      // rank
      var rank = await global.systems.ranks.get(opts.sender.username)
      if (await global.systems.ranks.isEnabled() && !_.isNull(rank)) message.push(rank)

      // watchTime
      var watched = await global.users.getWatchedOf(opts.sender.userId)
      message.push((watched / 1000 / 60 / 60).toFixed(1) + 'h')

      // points
      if (await global.systems.points.isEnabled()) {
        let userPoints = await global.systems.points.getPointsOf(opts.sender.userId)
        message.push(userPoints + ' ' + await global.systems.points.getPointsName(userPoints))
      }

      // message count
      var messages = await global.users.getMessagesOf(opts.sender.userId)
      message.push(messages + ' ' + global.commons.getLocalizedName(messages, 'core.messages'))

      // tips
      const [tips, currency] = await Promise.all([
        global.db.engine.find('users.tips', { id: opts.sender.userId }),
        global.configuration.getValue('currency')
      ])
      let tipAmount = 0
      for (let t of tips) {
        tipAmount += global.currency.exchange(t.amount, t.currency, currency)
      }
      message.push(`${Number(tipAmount).toFixed(2)} ${currency}`)

      global.commons.sendMessage(message.join(' | '), opts.sender)
    } catch (e) {
      global.log.error(e.stack)
    }
  }

  async sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('find.viewers', async (opts, cb) => {
        opts = _.defaults(opts, { page: 1, sortBy: 'username', order: '', filter: null, show: { subscribers: null, followers: null, active: null, regulars: null } })
        opts.page-- // we are counting index from 0

        const processUser = async (viewer) => {
          if (!viewer.lock) viewer.lock = {}

          // TIPS
          let tipsOfViewer = _.filter(tips, (o) => o.id === viewer.id)
          if (!_.isEmpty(tipsOfViewer)) {
            let tipsAmount = 0
            for (let tip of tipsOfViewer) tipsAmount += global.currency.exchange(tip.amount, tip.currency, await global.configuration.getValue('currency'))
            _.set(viewer, 'stats.tips', tipsAmount)
          } else {
            _.set(viewer, 'stats.tips', 0)
          }
          _.set(viewer, 'custom.currency', global.currency.symbol(await global.configuration.getValue('currency')))

          // BITS
          let bitsOfViewer = _.filter(bits, (o) => o.id === viewer.id)
          if (!_.isEmpty(bitsOfViewer)) {
            let bitsAmount = 0
            for (let bit of bitsOfViewer) bitsAmount += parseInt(bit.amount, 10)
            _.set(viewer, 'stats.bits', bitsAmount)
          } else {
            _.set(viewer, 'stats.bits', 0)
          }

          // ONLINE
          let isOnline = !_.isEmpty(_.filter(online, (o) => o.username === viewer.username))
          _.set(viewer, 'is.online', isOnline)

          // POINTS
          if (!_.isEmpty(_.filter(points, (o) => o.id === viewer.id))) {
            _.set(viewer, 'points', await global.systems.points.getPointsOf(viewer.id))
          } else _.set(viewer, 'points', 0)

          // MESSAGES
          if (!_.isEmpty(_.filter(messages, (o) => o.id === viewer.id))) {
            _.set(viewer, 'stats.messages', await global.users.getMessagesOf(viewer.id))
          } else _.set(viewer, 'stats.messages', 0)

          // WATCHED
          if (!_.isEmpty(_.filter(messages, (o) => o.id === viewer.id))) {
            _.set(viewer, 'time.watched', await global.users.getWatchedOf(viewer.id))
          } else _.set(viewer, 'time.watched', 0)
          return viewer
        }

        let [viewers, tips, bits, online, points, messages] = await Promise.all([
          global.users.getAll(),
          global.db.engine.find('users.tips'),
          global.db.engine.find('users.bits'),
          global.db.engine.find('users.online'),
          global.db.engine.find('users.points'),
          global.db.engine.find('users.messages')
        ])

        // filter users
        if (!_.isNil(opts.filter)) viewers = _.filter(viewers, (o) => o.username && o.username.toLowerCase().startsWith(opts.filter.toLowerCase().trim()))
        if (!_.isNil(opts.show.subscribers)) viewers = _.filter(viewers, (o) => _.get(o, 'is.subscriber', false) === opts.show.subscribers)
        if (!_.isNil(opts.show.followers)) viewers = _.filter(viewers, (o) => _.get(o, 'is.follower', false) === opts.show.followers)
        if (!_.isNil(opts.show.regulars)) viewers = _.filter(viewers, (o) => _.get(o, 'is.regular', false) === opts.show.regulars)
        if (!_.isNil(opts.show.active)) {
          viewers = _.filter(viewers, (o) => {
            return _.intersection(online.map((v) => v.username), viewers.map((v) => v.username)).includes(o.username) === opts.show.active
          })
        }
        // we need to fetch all viewers and then sort
        let toAwait = []
        let i = 0
        for (let viewer of viewers) {
          if (i > 100) {
            await Promise.all(toAwait)
            i = 0
          }
          i++
          toAwait.push(processUser(viewer))
        }
        await Promise.all(toAwait)
        cb(viewers)
      })
      socket.on('followedAt.viewer', async (id, cb) => {
        try {
          const cid = global.oauth.channelId
          const url = `https://api.twitch.tv/helix/users/follows?from_id=${id}&to_id=${cid}`

          const token = await global.oauth.settings.bot.accessToken
          if (token === '') cb(new Error('no token available'), null)

          const request = await axios.get(url, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + token
            }
          })

          if (request.data.total === 0) throw new Error('Not a follower')
          else cb(null, new Date(request.data.data[0].followed_at).getTime())
        } catch (e) {
          cb(e, null)
        }
      })
      socket.on('findOne.viewer', async (opts, cb) => {
        let [viewer, tips, bits, points, messages, watched] = await Promise.all([
          global.db.engine.findOne('users', { id: opts.where.id }),
          global.db.engine.find('users.tips', { id: opts.where.id }),
          global.db.engine.find('users.bits', { id: opts.where.id }),
          global.systems.points.getPointsOf(opts.where.id),
          global.users.getMessagesOf(opts.where.id),
          global.users.getWatchedOf(opts.where.id)
        ])
        let online = await global.db.engine.findOne('users.online', { username: viewer.username })

        _.set(viewer, 'stats.tips', tips)
        _.set(viewer, 'stats.bits', bits)
        _.set(viewer, 'stats.messages', messages)
        _.set(viewer, 'points', points)
        _.set(viewer, 'time.watched', watched)

        if (!viewer.lock) {
          viewer.lock = {
            follower: false,
            subscriber: false,
            followed_at: false,
            subscribed_at: false
          }
        } else {
          if (typeof viewer.lock.follower === 'undefined' || viewer.lock.follower === null) viewer.lock.follower = false
          if (typeof viewer.lock.subscriber === 'undefined' || viewer.lock.subscriber === null) viewer.lock.subscriber = false
          if (typeof viewer.lock.followed_at === 'undefined' || viewer.lock.followed_at === null) viewer.lock.followed_at = false
          if (typeof viewer.lock.subscribed_at === 'undefined' || viewer.lock.subscribed_at === null) viewer.lock.subscribed_at = false
        }

        if (!viewer.is) {
          viewer.is = {
            follower: false,
            subscriber: false,
            regular: false
          }
        } else {
          if (typeof viewer.is.follower === 'undefined' || viewer.is.follower === null) viewer.is.follower = false
          if (typeof viewer.is.subscriber === 'undefined' || viewer.is.subscriber === null) viewer.is.subscriber = false
          if (typeof viewer.is.regular === 'undefined' || viewer.is.regular === null) viewer.is.regular = false
        }

        // ONLINE
        let isOnline = !_.isEmpty(_.filter(online, (o) => o.username === viewer.username))
        _.set(viewer, 'is.online', isOnline)

        cb(null, viewer)
      })
      socket.on('delete.viewer', async (opts, cb) => {
        const id = cb._id
        await global.db.engine.remove('users.points', { id })
        await global.db.engine.remove('users.messages', { id })
        await global.db.engine.remove('users.watched', { id })
        await global.db.engine.remove('users.bits', { id })
        await global.db.engine.remove('users.tips', { id })
        await global.db.engine.remove('users', { id })
        cb(null)
      })
      socket.on('update.viewer', async (opts, cb) => {
        const id = opts.items[0]._id
        const viewer = opts.items[0].viewer; delete viewer._id

        // update user points
        await global.db.engine.remove('users.points', { id })
        await global.db.engine.insert('users.points', { id, points: isNaN(Number(viewer.points)) ? 0 : Number(viewer.points) })
        delete viewer.points

        // update messages
        await global.db.engine.remove('users.messages', { id })
        await global.db.engine.insert('users.messages', { id, messages: isNaN(Number(viewer.stats.messages)) ? 0 : Number(viewer.stats.messages) })
        delete viewer.stats.messages

        // update watch time
        await global.db.engine.remove('users.watched', { id })
        await global.db.engine.insert('users.watched', { id, watched: isNaN(Number(viewer.time.watched)) ? 0 : Number(viewer.time.watched) })
        delete viewer.time.watched

        const bits = viewer.stats.bits; delete viewer.stats.bits
        for (let b of bits) {
          delete b.editation
          if (b.new) {
            delete b.new; delete b._id
            await global.db.engine.insert('users.bits', b)
          } else {
            delete b.new
            const _id = String(b._id); delete b._id
            await global.db.engine.update('users.bits', { _id }, b)
          }
        }

        const tips = viewer.stats.tips; delete viewer.stats.tips
        for (let b of tips) {
          delete b.editation
          if (b.new) {
            delete b.new
            await global.db.engine.insert('users.tips', b)
          } else {
            delete b.new
            const _id = String(b._id); delete b._id
            await global.db.engine.update('users.tips', { _id }, b)
          }
        }

        await global.db.engine.update('users', { id }, viewer)
        cb(null, id)
      })
    })
  }

  async setById (id: string, object: Object) {
    if (_.isNil(id)) return global.log.error('id is NULL!\n' + new Error().stack)
    return global.db.engine.update('users', { id }, object)
  }
}

module.exports = Users
