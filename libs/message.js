const mathjs = require('mathjs')
const snekfetch = require('snekfetch')
const safeEval = require('safe-eval')
const decode = require('decode-html')
const querystring = require('querystring')
const debug = require('debug')
const _ = require('lodash')
const config = require('../config.json')
const cluster = require('cluster')

class Message {
  constructor (message) {
    this.message = message
  }

  async global () {
    let variables = [
      'game', 'viewers', 'views', 'followers',
      'hosts', 'subscribers', 'bits'
    ]
    let items = await global.db.engine.find('api.current')
    for (let variable of variables) {
      const regexp = new RegExp(`\\$${variable}`, 'g')
      let value = _.find(items, (o) => o.key === variable)
      value = _.isEmpty(value) ? '' : value.value
      this.message = this.message.replace(regexp, value)
    }

    let events = _.orderBy(await global.db.engine.find('widgetsEventList'), 'timestamp', 'desc')
    // latestFollower
    let latestFollower = _.find(events, (o) => o.event === 'follow')
    this.message = this.message.replace(/\$latestFollower/g, !_.isNil(latestFollower) ? latestFollower.username : 'n/a')

    // latestSubscriber
    let latestSubscriber = _.find(events, (o) => ['sub', 'resub', 'subgift'].includes(o.event))
    this.message = this.message.replace(/\$latestSubscriber/g, !_.isNil(latestSubscriber) ? latestSubscriber.username : 'n/a')

    // latestTip, latestTipAmount, latestTipCurrency, latestTipMessage
    let latestTip = _.find(events, (o) => o.event === 'tip')
    this.message = this.message.replace(/\$latestTipAmount/g, !_.isNil(latestTip) ? parseFloat(latestTip.amount).toFixed(2) : 'n/a')
    this.message = this.message.replace(/\$latestTipCurrency/g, !_.isNil(latestTip) ? latestTip.currency : 'n/a')
    this.message = this.message.replace(/\$latestTipMessage/g, !_.isNil(latestTip) ? latestTip.message : 'n/a')
    this.message = this.message.replace(/\$latestTip/g, !_.isNil(latestTip) ? latestTip.username : 'n/a')

    // latestCheer, latestCheerAmount, latestCheerCurrency, latestCheerMessage
    let latestCheer = _.find(events, (o) => o.event === 'cheer')
    this.message = this.message.replace(/\$latestCheerAmount/g, !_.isNil(latestCheer) ? parseInt(latestCheer.amount, 10) : 'n/a')
    this.message = this.message.replace(/\$latestCheerMessage/g, !_.isNil(latestCheer) ? latestCheer.message : 'n/a')
    this.message = this.message.replace(/\$latestCheer/g, !_.isNil(latestCheer) ? latestCheer.username : 'n/a')
  }

  async parse (attr) {
    const d = debug('parser:parse')

    let random = {
      '(random.online.viewer)': async function () {
        let onlineUsers = await global.db.engine.find('users.online')
        let onlineViewers = []
        for (let user of onlineUsers) {
          if (user.username !== attr.sender && user.username !== config.settings.bot_username.toLowerCase()) {
            onlineViewers.push(user.username)
          }
        }
        if (onlineViewers.length === 0) return 'unknown'
        return _.sample(onlineViewers)
      },
      '(random.online.follower)': async function () {
        let onlineViewers = await global.db.engine.find('users.online')
        let onlineFollowers = []
        for (let viewer of onlineViewers) {
          if (viewer.username !== attr.sender && viewer.username !== config.settings.bot_username.toLowerCase()) {
            let user = await global.db.engine.find('users', { username: viewer.username, is: { follower: true } })
            if (!_.isEmpty(user)) onlineFollowers.push(user.username)
          }
        }
        if (onlineFollowers.length === 0) return 'unknown'
        return _.sample(onlineFollowers)
      },
      '(random.online.subscriber)': async function () {
        let onlineViewers = await global.db.engine.find('users.online')
        let onlineSubscribers = []
        for (let viewer of onlineViewers) {
          if (viewer.username !== attr.sender && viewer.username !== config.settings.bot_username.toLowerCase()) {
            let user = await global.db.engine.find('users', { username: viewer.username, is: { subscriber: true } })
            if (!_.isEmpty(user)) onlineSubscribers.push(user.username)
          }
        }
        if (onlineSubscribers.length === 0) return 'unknown'
        return _.sample(onlineSubscribers)
      },
      '(random.viewer)': async function () {
        let viewer = await global.users.getAll()
        viewer = _.filter(viewer, function (o) { return o.username !== attr.sender && o.username !== config.settings.bot_username.toLowerCase() })
        if (viewer.length === 0) return 'unknown'
        return _.sample(viewer).username
      },
      '(random.follower)': async function () {
        let follower = await global.users.getAll({ is: { follower: true } })
        follower = _.filter(follower, function (o) { return o.username !== attr.sender && o.username !== config.settings.bot_username.toLowerCase() })
        if (follower.length === 0) return 'unknown'
        return _.sample(follower).username
      },
      '(random.subscriber)': async function () {
        let subscriber = await global.users.getAll({ is: { subscriber: true } })
        subscriber = _.filter(subscriber, function (o) { return o.username !== attr.sender && o.username !== config.settings.bot_username.toLowerCase() })
        if (subscriber.length === 0) return 'unknown'
        return _.sample(subscriber).username
      },
      '(random.number-#-to-#)': async function (filter) {
        let numbers = filter.replace('(random.number-', '')
          .replace(')', '')
          .split('-to-')

        try {
          let lastParamUsed = 0
          for (let index in numbers) {
            if (!_.isFinite(parseInt(numbers[index], 10))) {
              let param = attr.param.split(' ')
              if (_.isNil(param[lastParamUsed])) return 0

              numbers[index] = param[lastParamUsed]
              lastParamUsed++
            }
          }
          return _.random(numbers[0], numbers[1])
        } catch (e) {
          return 0
        }
      },
      '(random.true-or-false)': async function () {
        return Math.random() < 0.5
      }
    }
    let custom = {
      '$_#': async function (filter) {
        let variable = filter.replace('$_', '')
        let isMod = await global.commons.isMod(attr.sender)
        if ((global.commons.isOwner(attr.sender) || isMod) &&
          (!_.isUndefined(attr.param) && attr.param.length !== 0)) {
          await global.db.engine.update('customvars', { key: variable }, { key: variable, value: attr.param })
          let msg = await global.commons.prepare('filters.setVariable', { value: attr.param, variable: variable })
          global.commons.sendMessage(msg, { username: attr.sender, quiet: _.get(attr, 'quiet', false) })

          if (require('cluster').isWorker) process.send({ type: 'widget_custom_variables', emit: 'refresh' })
          else global.widgets.custom_variables.io.emit('refresh') // send update to widget
          const regexp = new RegExp(`\\$_${variable}`, 'ig')
          let title = await global.cache.rawStatus()
          if (title.match(regexp)) process.send({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: { 0: null } })
          return ''
        }
        let cvar = await global.db.engine.findOne('customvars', { key: variable })
        return _.isEmpty(cvar.value) ? '' : cvar.value
      }
    }
    let param = {
      '$param': async function (filter) {
        if (!_.isUndefined(attr.param) && attr.param.length !== 0) return attr.param
        return ''
      },
      '$!param': async function (filter) {
        if (!_.isUndefined(attr.param) && attr.param.length !== 0) return attr.param
        return 'n/a'
      }
    }
    let qs = {
      '$querystring': async function (filter) {
        if (!_.isUndefined(attr.param) && attr.param.length !== 0) return querystring.escape(attr.param)
        return ''
      }
    }
    let info = {
      '(game)': async function (filter) {
        return _.get(await global.db.engine.findOne('api.current', { key: 'game' }), 'value', 'n/a')
      },
      '(status)': async function (filter) {
        return _.get(await global.db.engine.findOne('api.current', { key: 'status' }), 'value', 'n/a')
      }
    }
    let command = {
      '(!!#)': async function (filter) {
        if (!_.isString(attr.sender)) attr.sender = _.get(attr, 'sender.username', null)
        let cmd = filter
          .replace('!', '') // replace first !
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + attr.sender)
          .replace(/\$param/g, attr.param)
        if (cluster.isMaster) _.sample(cluster.workers).send({ type: 'message', sender: { username: attr.sender }, message: cmd, skip: true, quiet: true }) // resend to random worker
        else process.send({ type: 'parse', sender: { username: attr.sender }, message: cmd, skip: true, quiet: true })
        return ''
      },
      '(!#)': async function (filter) {
        if (!_.isString(attr.sender)) attr.sender = _.get(attr, 'sender.username', null)
        let cmd = filter
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + attr.sender)
          .replace(/\$param/g, attr.param)
        if (cluster.isMaster) _.sample(cluster.workers).send({ type: 'message', sender: { username: attr.sender }, message: cmd, skip: true, quiet: false }) // resend to random worker
        else process.send({ type: 'parse', sender: { username: attr.sender }, message: cmd, skip: true, quiet: false })
        return ''
      }
    }
    let price = {
      '(price)': async function (filter) {
        let price = 0
        if (global.commons.isSystemEnabled('price') && global.commons.isSystemEnabled('points')) {
          price = _.find(global.systems.price.prices, function (o) { return o.command === attr.cmd.command })
          price = !_.isNil(price) ? price.price : 0
        }
        return [price, await global.systems.points.getPointsName(price)].join(' ')
      }
    }
    let online = {
      '(onlineonly)': async function (filter) {
        return global.cache.isOnline()
      },
      '(offlineonly)': async function (filter) {
        return !(await global.cache.isOnline())
      }
    }
    let list = {
      '(list.#)': async function (filter) {
        let system = filter.replace('(list.', '').replace(')', '')

        let [alias, commands, cooldowns, ranks] = await Promise.all([
          global.db.engine.find('alias', { visible: true, enabled: true }),
          global.db.engine.find('commands', { visible: true, enabled: true }),
          global.db.engine.find('cooldowns', { enabled: true }),
          global.db.engine.find('ranks')])

        switch (system) {
          case 'alias':
            return _.size(alias) === 0 ? ' ' : (_.map(alias, 'alias')).join(', ')
          case '!alias':
            return _.size(alias) === 0 ? ' ' : '!' + (_.map(alias, 'alias')).join(', !')
          case 'command':
            return _.size(commands) === 0 ? ' ' : (_.map(commands, 'command')).join(', ')
          case '!command':
            return _.size(commands) === 0 ? ' ' : '!' + (_.map(commands, 'command')).join(', !')
          case 'cooldown':
            list = _.map(cooldowns, function (o, k) {
              const time = o.miliseconds
              return o.key + ': ' + (parseInt(time, 10) / 1000) + 's'
            }).join(', ')
            return list.length > 0 ? list : ' '
          case '!cooldown':
            list = _.map(cooldowns, function (o, k) {
              const time = o.miliseconds
              return '!' + o.key + ': ' + (parseInt(time, 10) / 1000) + 's'
            }).join(', ')
            return list.length > 0 ? list : ' '
          case 'ranks':
            list = _.map(_.orderBy(ranks, 'hours', 'asc'), (o) => {
              return `${o.value} (${o.hours}h)`
            }).join(', ')
            return list.length > 0 ? list : ' '
          default:
            return ''
        }
      }
    }
    let math = {
      '(math.#)': async function (filter) {
        let toEvaluate = filter.replace(/\(math./g, '').replace(/\)/g, '')

        // check if custom variables are here
        const regexp = /(\$_\w+)/g
        let match = toEvaluate.match(regexp)
        if (match) {
          for (let variable of match) {
            toEvaluate = toEvaluate.replace(
              variable,
              _.get((await global.db.engine.findOne('customvars', { key: variable.replace('$_', '') })), 'value', 0)
            )
          }
        }
        return mathjs.eval(toEvaluate)
      }
    }
    let evaluate = {
      '(eval#)': async function (filter) {
        let toEvaluate = filter.replace('(eval ', '').slice(0, -1)
        if (_.isObject(attr.sender)) attr.sender = attr.sender.username

        let awaits = await Promise.all([
          global.users.getAll(),
          global.users.get(attr.sender)
        ])

        let onlineViewers = await global.db.engine.find('users.online')

        let onlineSubscribers = []
        for (let viewer of onlineViewers) {
          let user = await global.db.engine.find('users', { username: viewer.username, is: { ubscriber: true } })
          if (!_.isEmpty(user)) onlineSubscribers.push(user.username)
        }
        onlineSubscribers = _.filter(onlineSubscribers, function (o) { return o !== attr.sender })

        let onlineFollowers = []
        for (let viewer of onlineViewers) {
          let user = await global.db.engine.find('users', { username: viewer.username, is: { follower: true } })
          if (!_.isEmpty(user)) onlineFollowers.push(user.username)
        }
        onlineFollowers = _.filter(onlineFollowers, function (o) { return o !== attr.sender })

        let randomVar = {
          online: {
            viewer: _.sample(onlineViewers),
            follower: _.sample(onlineFollowers),
            subscriber: _.sample(onlineSubscribers)
          },
          viewer: _.sample(_.map(awaits[0], 'username')),
          follower: _.sample(_.map(_.filter(awaits[0], (o) => _.get(o, 'is.follower', false)), 'username')),
          subscriber: _.sample(_.map(_.filter(awaits[0], (o) => _.get(o, 'is.subscriber', false)), 'username'))
        }
        let users = awaits[0]
        let is = awaits[1].is

        let toEval = `(function evaluation () {  ${toEvaluate} })()`
        const context = {
          _: _,
          users: users,
          is: is,
          random: randomVar,
          sender: await global.configuration.getValue('atUsername') ? `@${attr.sender}` : `${attr.sender}`,
          param: _.isNil(attr.param) ? null : attr.param
        }
        d(toEval, context); return (safeEval(toEval, context))
      }
    }
    let ifp = {
      '(if#)': async function (filter) {
        // (if $days>2|More than 2 days|Less than 2 days)
        try {
          let toEvaluate = filter
            .replace('(if ', '')
            .slice(0, -1)
            .replace(/\$param|\$!param/g, attr.param) // replace params
          let [check, ifTrue, ifFalse] = toEvaluate.split('|')
          check = check.startsWith('>') || check.startsWith('<') || check.startsWith('=') ? false : check // force check to false if starts with comparation

          d(toEvaluate, check, safeEval(check), ifTrue, ifFalse)
          if (_.isNil(ifTrue)) return
          if (safeEval(check)) return ifTrue
          return _.isNil(ifFalse) ? '' : ifFalse
        } catch (e) {
          d(e)
          return ''
        }
      }
    }
    let stream = {
      '(stream|#|game)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|game)', '')
        try {
          let request = await snekfetch.get(`https://api.twitch.tv/kraken/users?login=${channel}`)
            .set('Accept', 'application/vnd.twitchtv.v5+json')
            .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
            .set('Client-ID', config.settings.client_id)
          const channelId = request.body.users[0]._id
          request = await snekfetch.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`)
            .set('Client-ID', config.settings.client_id)
            .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
          return global.api.getGameFromId(request.body.data[0].game_id)
        } catch (e) { return 'n/a' } // return nothing on error
      },
      '(stream|#|title)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|title)', '')
        try {
          let request = await snekfetch.get(`https://api.twitch.tv/kraken/users?login=${channel}`)
            .set('Accept', 'application/vnd.twitchtv.v5+json')
            .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
            .set('Client-ID', config.settings.client_id)
          const channelId = request.body.users[0]._id
          request = await snekfetch.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`)
            .set('Client-ID', config.settings.client_id)
            .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
          return request.body.data[0].title
        } catch (e) { return 'n/a' } // return nothing on error
      },
      '(stream|#|viewers)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|viewers)', '')
        try {
          let request = await snekfetch.get(`https://api.twitch.tv/kraken/users?login=${channel}`)
            .set('Accept', 'application/vnd.twitchtv.v5+json')
            .set('Authorization', 'OAuth ' + config.settings.bot_oauth.split(':')[1])
            .set('Client-ID', config.settings.client_id)
          const channelId = request.body.users[0]._id
          request = await snekfetch.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`)
            .set('Client-ID', config.settings.client_id)
            .set('Authorization', 'Bearer ' + config.settings.bot_oauth.split(':')[1])
          return request.body.data[0].viewer_count
        } catch (e) { return '0' } // return nothing on error
      }
    }

    // $currentSong - Spotify -> YTPlayer
    if (!_.isNil(global.integrations) && !_.isEmpty(await global.integrations.spotify.currentSong) && (await global.integrations.spotify.currentSong).is_playing && (await global.integrations.spotify.currentSong).is_enabled) {
      this.message = this.message.replace(/\$currentSong/g, (await global.integrations.spotify.currentSong).song + ' (' + (await global.integrations.spotify.currentSong).artist + ')')
    } else if (global.commons.isSystemEnabled('songs')) this.message = this.message.replace(/\$currentSong/g, _.get(await global.systems.songs.currentSong, 'title', global.translate('songs.not-playing')))
    else this.message = this.message.replace(/\$currentSong/g, global.translate('songs.not-playing'))

    await this.global()

    await this.parseMessageEach(price); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(info); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(random); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(ifp, false); d('parseMessageEach: %s', this.message)
    await this.parseMessageEval(evaluate, decode(this.message)); d('parseMessageEval: %s', this.message)
    await this.parseMessageEach(param, true); d('parseMessageEach: %s', this.message)
    // local replaces
    if (!_.isNil(attr)) {
      const isWithAt = await global.configuration.getValue('atUsername')
      for (let [key, value] of Object.entries(attr)) {
        if (_.includes(['sender'], key)) value = isWithAt ? `@${value}` : value
        this.message = this.message.replace(new RegExp('[$]' + key, 'g'), value)
      }
    }
    await this.parseMessageEach(math); d('parseMessageEach: %s', this.message)
    await this.parseMessageVariables(custom); d('parseMessageEach: %s', this.message)
    await this.parseMessageOnline(online); d('parseMessageOnline: %s', this.message)
    await this.parseMessageCommand(command); d('parseMessageCommand: %s', this.message)
    await this.parseMessageEach(qs); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(list); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(stream); d('parseMessageEach: %s', this.message)
    await this.parseMessageApi(); d('parseMessageApi: %s', this.message)

    return this.message
  }

  async parseMessageApi () {
    const d = debug('parser:parseMessageApi')
    if (this.message.trim().length === 0) return

    let rMessage = this.message.match(/\(api\|(http\S+)\)/i)
    if (!_.isNil(rMessage) && !_.isNil(rMessage[1])) {
      this.message = this.message.replace(rMessage[0], '').trim() // remove api command from message
      let url = rMessage[1].replace(/&amp;/g, '&')
      let response = await snekfetch.get(url)
      if (response.status !== 200) {
        return global.translate('core.api.error')
      }

      // search for api datas in this.message
      let rData = this.message.match(/\(api\.(?!_response)(\S*?)\)/gi)
      if (_.isNil(rData)) {
        this.message = this.message.replace('(api._response)', response.body.toString().replace(/^"(.*)"/, '$1'))
      } else {
        if (_.isBuffer(response.body)) response.body = JSON.parse(response.body.toString())
        d('API response %s: %o', url, response.body)
        for (let tag of rData) {
          let path = response.body
          let ids = tag.replace('(api.', '').replace(')', '').split('.')
          _.each(ids, function (id) {
            let isArray = id.match(/(\S+)\[(\d+)\]/i)
            if (isArray) {
              path = path[isArray[1]][isArray[2]]
            } else {
              path = path[id]
            }
          })
          this.message = this.message.replace(tag, !_.isNil(path) ? path : global.translate('core.api.not-available'))
        }
      }
    }
  }

  async parseMessageCommand (filters) {
    if (this.message.trim().length === 0) return
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) continue

      let fnc = filters[key]
      let regexp = _.escapeRegExp(key)

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '.*?')
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')))
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          await fnc(rMessage[bkey])
          this.message = this.message.replace(rMessage[bkey], '').trim()
        }
      }
    }
  }

  async parseMessageOnline (filters) {
    if (this.message.trim().length === 0) return
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) continue

      let fnc = filters[key]
      let regexp = _.escapeRegExp(key)

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '(\\S+)')
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')))
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          if (!await fnc(rMessage[bkey])) this.message = ''
          else {
            this.message = this.message.replace(rMessage[bkey], '').trim()
          }
        }
      }
    }
  }

  async parseMessageEval (filters) {
    if (this.message.trim().length === 0) return
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) continue

      let fnc = filters[key]
      let regexp = _.escapeRegExp(key)

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '([\\S ]+)')
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')))
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          let newString = await fnc(rMessage[bkey])
          if (_.isUndefined(newString) || newString.length === 0) this.message = ''
          this.message = this.message.replace(rMessage[bkey], newString).trim()
        }
      }
    }
  }

  async parseMessageVariables (filters, removeWhenEmpty) {
    if (_.isNil(removeWhenEmpty)) removeWhenEmpty = true

    if (this.message.trim().length === 0) return
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) continue

      let fnc = filters[key]
      let regexp = _.escapeRegExp(key)

      regexp = regexp.replace(/#/g, '([a-zA-Z_]+)')
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')))
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          let newString = await fnc(rMessage[bkey])
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) this.message = ''
          this.message = this.message.replace(rMessage[bkey], newString).trim()
        }
      }
    }
  }

  async parseMessageEach (filters, removeWhenEmpty) {
    if (_.isNil(removeWhenEmpty)) removeWhenEmpty = true

    if (this.message.trim().length === 0) return
    for (var key in filters) {
      if (!filters.hasOwnProperty(key)) continue

      let fnc = filters[key]
      let regexp = _.escapeRegExp(key)

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '([\\S ]+?)')
      let rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')))
      if (!_.isNull(rMessage)) {
        for (var bkey in rMessage) {
          let newString = await fnc(rMessage[bkey])
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) this.message = ''
          this.message = this.message.replace(rMessage[bkey], newString).trim()
        }
      }
    }
  }
}

module.exports = Message
