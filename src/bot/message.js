const mathjs = require('mathjs')
const axios = require('axios')
const safeEval = require('safe-eval')
const decode = require('decode-html')
const querystring = require('querystring')
const debug = require('debug')
const _ = require('lodash')
const config = require('@config')
const cluster = require('cluster')
const crypto = require('crypto')

const Entities = require('html-entities').AllHtmlEntities

class Message {
  constructor (message) {
    this.message = Entities.decode(message)
  }

  async global (opts) {
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

    if (!_.isNil(global.integrations) && !_.isEmpty(await global.integrations.spotify.currentSong) && (await global.integrations.spotify.currentSong).is_playing && (await global.integrations.spotify.currentSong).is_enabled) {
      // load spotify format
      const [format, song] = await Promise.all([global.integrations.spotify.format, global.integrations.spotify.currentSong])
      if (opts.escape) {
        song.song = song.song.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`)
        song.artist = song.artist.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`)
      }
      this.message = this.message.replace(/\$currentSong/g, format.replace(/\$song/g, song.song).replace(/\$artist/g, song.artist))
    } else if (await global.systems.songs.isEnabled()) {
      let currentSong = _.get(JSON.parse(await global.systems.songs.settings._.currentSong), 'title', global.translate('songs.not-playing'))
      if (opts.escape) {
        currentSong = currentSong.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`)
      }
      this.message = this.message.replace(/\$currentSong/g, currentSong)
    } else this.message = this.message.replace(/\$currentSong/g, global.translate('songs.not-playing'))

    return Entities.decode(this.message)
  }

  async parse (attr) {
    const d = debug('parser:parse')
    d('Attributes: %j', attr)

    this.message = await this.message // if is promise

    let random = {
      '(random.online.viewer)': async function () {
        const onlineViewers = _.filter(
          (await global.db.engine.find('users.online')).map((o) => o.username),
          (o) => o.username !== attr.sender && o.username !== config.settings.bot_username.toLowerCase())
        if (onlineViewers.length === 0) return 'unknown'
        return _.sample(onlineViewers)
      },
      '(random.online.follower)': async function () {
        const onlineViewers = (await global.db.engine.find('users.online')).map((o) => o.username)
        const followers = _.filter(
          (await global.db.engine.find('users', { is: { follower: true } })).map((o) => o.username),
          (o) => o.username !== attr.sender && o.username !== config.settings.bot_username.toLowerCase())
        let onlineFollowers = _.intersection(onlineViewers, followers)
        if (onlineFollowers.length === 0) return 'unknown'
        return _.sample(onlineFollowers)
      },
      '(random.online.subscriber)': async function () {
        const onlineViewers = (await global.db.engine.find('users.online')).map((o) => o.username)
        const subscribers = _.filter(
          (await global.db.engine.find('users', { is: { subscriber: true } })).map((o) => o.username),
          (o) => o.username !== attr.sender && o.username !== config.settings.bot_username.toLowerCase())
        let onlineSubscribers = _.intersection(onlineViewers, subscribers)
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
      '$_#': async (variable) => {
        let isMod = await global.commons.isMod(attr.sender)
        if ((global.commons.isOwner(attr.sender) || isMod) &&
          (!_.isNil(attr.param) && attr.param.length !== 0)) {
          let state = await global.customvariables.setValueOf(variable, attr.param, { sender: attr.sender })

          if (state.updated.responseType === 0) {
            // default
            if (state.isOk && !state.isEval) {
              let msg = await global.commons.prepare('filters.setVariable', { value: state.updated.currentValue, variable: variable })
              global.commons.sendMessage(msg, { username: attr.sender, skip: true, quiet: _.get(attr, 'quiet', false) })
            }
            return state.isEval ? state.updated.currentValue : ''
          } else if (state.updated.responseType === 1) {
            // custom
            global.commons.sendMessage(state.updated.responseText.replace('$value', state.updated.currentValue), { username: attr.sender, skip: true, quiet: _.get(attr, 'quiet', false) })
            return ''
          } else {
            // command
            return state.updated.currentValue
          }
        }
        return global.customvariables.getValueOf(variable, { sender: attr.sender, param: attr.param })
      },
      // force quiet variable set
      '$!_#': async (variable) => {
        variable = variable.replace('$!_', '$_')
        let isMod = await global.commons.isMod(attr.sender)
        if ((global.commons.isOwner(attr.sender) || isMod) &&
          (!_.isNil(attr.param) && attr.param.length !== 0)) {
          let state = await global.customvariables.setValueOf(variable, attr.param, { sender: attr.sender })
          return state.isEval ? state.updated.currentValue : ''
        }
        return global.customvariables.getValueOf(variable, { sender: attr.sender, param: attr.param })
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
      '(count)': async function (filter) {
        const count = await global.systems.customCommands.getCountOf(attr.cmd)
        return String(count)
      },
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
        else if (process.send) process.send({ type: 'parse', sender: { username: attr.sender }, message: cmd, skip: true, quiet: true })
        return ''
      },
      '(!#)': async function (filter) {
        if (!_.isString(attr.sender)) attr.sender = _.get(attr, 'sender.username', null)
        let cmd = filter
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + attr.sender)
          .replace(/\$param/g, attr.param)
        if (cluster.isMaster) _.sample(cluster.workers).send({ type: 'message', sender: { username: attr.sender }, message: cmd, skip: true, quiet: false }) // resend to random worker
        else if (process.send) process.send({ type: 'parse', sender: { username: attr.sender }, message: cmd, skip: true, quiet: false })
        return ''
      }
    }
    let price = {
      '(price)': async function (filter) {
        let price = 0
        if (await global.systems.price.isEnabled()) {
          let command = await global.db.engine.findOne(global.systems.price.collection.data, { command: attr.cmd })
          price = _.isEmpty(command) ? 0 : command.price
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
          global.db.engine.find(global.systems.alias.collection.data, { visible: true, enabled: true }),
          global.db.engine.find(global.systems.customCommands.collection.data, { visible: true, enabled: true }),
          global.db.engine.find(global.systems.cooldown.collection.data, { enabled: true }),
          global.db.engine.find(global.systems.ranks.collection.data)])

        switch (system) {
          case 'alias':
            return _.size(alias) === 0 ? ' ' : (_.map(alias, (o) => o.alias.replace('!', ''))).join(', ')
          case '!alias':
            return _.size(alias) === 0 ? ' ' : (_.map(alias, 'alias')).join(', ')
          case 'command':
            return _.size(commands) === 0 ? ' ' : (_.map(commands, (o) => o.command.replace('!', ''))).join(', ')
          case '!command':
            return _.size(commands) === 0 ? ' ' : (_.map(commands, 'command')).join(', ')
          case 'cooldown':
            list = _.map(cooldowns, function (o, k) {
              const time = o.miliseconds
              return o.key + ': ' + (parseInt(time, 10) / 1000) + 's'
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
        const d = debug('message:filter:eval'); d('Start')
        let toEvaluate = filter.replace('(eval ', '').slice(0, -1)
        if (_.isObject(attr.sender)) attr.sender = attr.sender.username

        d(toEvaluate)

        const containUsers = !_.isNil(toEvaluate.match(/users/g))
        const containRandom = !_.isNil(toEvaluate.replace(/Math\.random|_\.random/g, '').match(/random/g))
        const containOnline = !_.isNil(toEvaluate.match(/online/g))
        const containUrl = !_.isNil(toEvaluate.match(/url\(['"](.*?)['"]\)/g))
        d('contain users: %s', containUsers)
        d('contain random: %s', containRandom)
        d('contain online: %s', containOnline)
        d('contain url: %s', containUrl)

        let urls = []
        if (containUrl) {
          for (let match of toEvaluate.match(/url\(['"](.*?)['"]\)/g)) {
            const id = 'url' + crypto.randomBytes(64).toString('hex').slice(0, 5)
            const url = match.replace(/url\(['"]|["']\)/g, '')
            let response = await axios.get(url)
            try {
              response.data = JSON.parse(response.data.toString())
            } catch (e) {
              // JSON failed, treat like string
              response = response.data.toString()
            }
            urls.push({ id, response })
            toEvaluate = toEvaluate.replace(match, id)
          }
        }

        let users = []
        if (containUsers || containRandom) {
          users = await global.users.getAll()
        }
        let user = await global.users.get(attr.sender)

        let onlineViewers = []
        let onlineSubscribers = []
        let onlineFollowers = []

        if (containOnline) {
          onlineViewers = await global.db.engine.find('users.online')

          for (let viewer of onlineViewers) {
            let user = await global.db.engine.find('users', { username: viewer.username, is: { subscriber: true } })
            if (!_.isEmpty(user)) onlineSubscribers.push(user.username)
          }
          onlineSubscribers = _.filter(onlineSubscribers, function (o) { return o !== attr.sender })

          for (let viewer of onlineViewers) {
            let user = await global.db.engine.find('users', { username: viewer.username, is: { follower: true } })
            if (!_.isEmpty(user)) onlineFollowers.push(user.username)
          }
          onlineFollowers = _.filter(onlineFollowers, function (o) { return o !== attr.sender })
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
        }
        let is = user.is

        let toEval = `(function evaluation () {  ${toEvaluate} })()`
        let context = {
          _: _,
          users: users,
          is: is,
          random: randomVar,
          sender: await global.configuration.getValue('atUsername') ? `@${attr.sender}` : `${attr.sender}`,
          param: _.isNil(attr.param) ? null : attr.param
        }

        if (containUrl) {
          // add urls to context
          for (let url of urls) {
            context[url.id] = url.response
          }
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
          let request = await axios.get(`https://api.twitch.tv/kraken/users?login=${channel}`, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })
          const channelId = request.data.users[0]._id
          request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
              'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })
          return global.api.getGameFromId(request.data.data[0].game_id)
        } catch (e) { return 'n/a' } // return nothing on error
      },
      '(stream|#|title)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|title)', '')
        try {
          let request = await axios.get(`https://api.twitch.tv/kraken/users?login=${channel}`, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })
          const channelId = request.data.users[0]._id
          request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
              'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })
          return request.data.data[0].title
        } catch (e) { return 'n/a' } // return nothing on error
      },
      '(stream|#|viewers)': async function (filter) {
        const channel = filter.replace('(stream|', '').replace('|viewers)', '')
        try {
          let request = await axios.get(`https://api.twitch.tv/kraken/users?login=${channel}`, {
            headers: {
              'Accept': 'application/vnd.twitchtv.v5+json',
              'Authorization': 'OAuth ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })
          const channelId = request.data.users[0]._id
          request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
            headers: {
              'Authorization': 'Bearer ' + config.settings.bot_oauth.split(':')[1],
              'Client-ID': config.settings.client_id
            }
          })
          return request.data.data[0].viewer_count
        } catch (e) { return '0' } // return nothing on error
      }
    }

    await this.global({})

    await this.parseMessageEach(price); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(info); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(random); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(ifp, false); d('parseMessageEach: %s', this.message)
    await this.parseMessageVariables(custom); d('parseMessageEach: %s', this.message)
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
    await this.parseMessageOnline(online); d('parseMessageOnline: %s', this.message)
    await this.parseMessageCommand(command); d('parseMessageCommand: %s', this.message)
    await this.parseMessageEach(qs, false); d('parseMessageEach: %s', this.message)
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
      let response = await axios.get(url)
      if (response.status !== 200) {
        return global.translate('core.api.error')
      }

      // search for api datas in this.message
      let rData = this.message.match(/\(api\.(?!_response)(\S*?)\)/gi)
      if (_.isNil(rData)) {
        if (_.isObject(response.data)) {
          // Stringify object
          this.message = this.message.replace('(api._response)', JSON.stringify(response.data))
        } else this.message = this.message.replace('(api._response)', response.data.toString().replace(/^"(.*)"/, '$1'))
      } else {
        if (_.isBuffer(response.data)) response.data = JSON.parse(response.data.toString())
        d('API response %s: %o', url, response.data)
        for (let tag of rData) {
          let path = response.data
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

      regexp = regexp.replace(/#/g, '([a-zA-Z0-9_]+)')
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
