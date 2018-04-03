const mathjs = require('mathjs')
const snekfetch = require('snekfetch')
const safeEval = require('safe-eval')
const decode = require('decode-html')
const querystring = require('querystring')
const debug = require('debug')
const _ = require('lodash')

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
  }

  async parse (attr) {
    const d = debug('parser:parse')
    await this.global()

    let random = {
      '(random.online.viewer)': async function () {
        let onlineViewers = await global.users.getAll({ is: { online: true } })
        onlineViewers = _.filter(onlineViewers, function (o) { return o.username !== attr.sender.username })
        if (onlineViewers.length === 0) return 'unknown'
        return onlineViewers[_.random(0, onlineViewers.length - 1)].username
      },
      '(random.online.follower)': async function () {
        let onlineFollower = await global.users.getAll({ is: { online: true, follower: true } })
        onlineFollower = _.filter(onlineFollower, function (o) { return o.username !== attr.sender.username })
        if (onlineFollower.length === 0) return 'unknown'
        return onlineFollower[_.random(0, onlineFollower.length - 1)].username
      },
      '(random.online.subscriber)': async function () {
        let onlineSubscriber = await global.users.getAll({ is: { online: true, subscriber: true } })
        onlineSubscriber = _.filter(onlineSubscriber, function (o) { return o.username !== attr.sender.username })
        if (onlineSubscriber.length === 0) return 'unknown'
        return onlineSubscriber[_.random(0, onlineSubscriber.length - 1)].username
      },
      '(random.viewer)': async function () {
        let viewer = await global.users.getAll()
        viewer = _.filter(viewer, function (o) { return o.username !== attr.sender.username })
        if (viewer.length === 0) return 'unknown'
        return viewer[_.random(0, viewer.length - 1)].username
      },
      '(random.follower)': async function () {
        let follower = await global.users.getAll({ is: { follower: true } })
        follower = _.filter(follower, function (o) { return o.username !== attr.sender.username })
        if (follower.length === 0) return 'unknown'
        return follower[_.random(0, follower.length - 1)].username
      },
      '(random.subscriber)': async function () {
        let subscriber = await global.users.getAll({ is: { subscriber: true } })
        subscriber = _.filter(subscriber, function (o) { return o.username !== attr.sender.username })
        if (subscriber.length === 0) return 'unknown'
        return subscriber[_.random(0, subscriber.length - 1)].username
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
          let msg = global.commons.prepare('filters.setVariable', { value: attr.param, variable: variable })
          global.commons.sendMessage(msg, { username: attr.sender, quiet: _.get(attr, 'quiet', false) })

          if (require('cluster').isWorker) process.send({ type: 'widget_custom_variables', emit: 'refresh' })
          else global.widgets.custom_variables.io.emit('refresh') // send update to widget
          global.api.setTitleAndGame(global.api, null) // update title

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
        return global.api.current.game
      },
      '(status)': async function (filter) {
        return global.api.current.status
      }
    }
    let command = {
      '(!!#)': async function (filter) {
        if (!_.isString(attr.sender)) attr.sender = attr.sender.username
        let cmd = filter
          .replace('!', '') // replace first !
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + attr.sender)
          .replace(/\$param/g, attr.param)
        process.send({ type: 'parse', sender: attr.sender, message: cmd, skip: true, quiet: true })
        return ''
      },
      '(!#)': async function (filter) {
        if (!_.isString(attr.sender)) attr.sender = attr.sender.username
        let cmd = filter
          .replace(/\(|\)/g, '')
          .replace(/\$sender/g, (global.configuration.getValue('atUsername') ? '@' : '') + attr.sender)
          .replace(/\$param/g, attr.param)
        process.send({ type: 'parse', sender: attr.sender, message: cmd, skip: true, quiet: false })
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

        let randomVar = {
          online: {
            viewer: _.sample(_.map(_.filter(awaits[0], (o) => _.get(o, 'is.online', false)), 'username')),
            follower: _.sample(_.map(_.filter(awaits[0], (o) => _.get(o, 'is.online', false) && _.get(o, 'is.follower', false)), 'username')),
            subscriber: _.sample(_.map(_.filter(awaits[0], (o) => _.get(o, 'is.online', false) && _.get(o, 'is.subscriber', false)), 'username'))
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
          sender: global.configuration.getValue('atUsername') ? `@${attr.sender}` : `${attr.sender}`,
          param: _.isNil(attr.param) ? null : attr.param
        }
        d(toEval, context); return (safeEval(toEval, context))
      }
    }
    let ifp = {
      '(if#)': async function (filter) {
        // (if $days>2|More than 2 days|Less than 2 days)
        try {
          let toEvaluate = filter.replace('(if ', '').slice(0, -1)
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

    // $currentSong - Spotify -> YTPlayer
    if (!_.isNil(global.integrations) && !_.isEmpty(await global.integrations.spotify.currentSong) && (await global.integrations.spotify.currentSong).is_playing && (await global.integrations.spotify.currentSong).is_enabled) {
      this.message = this.message.replace(/\$currentSong/g, (await global.integrations.spotify.currentSong).song + ' (' + (await global.integrations.spotify.currentSong).artist + ')')
    } else if (global.commons.isSystemEnabled('songs')) this.message = this.message.replace(/\$currentSong/g, _.get(await global.systems.songs.currentSong, 'title', global.translate('songs.not-playing')))
    else this.message = this.message.replace(/\$currentSong/g, global.translate('songs.not-playing'))

    await this.parseMessageEach(math); d('parseMessageEach: %s', this.message)
    await this.parseMessageVariables(custom); d('parseMessageEach: %s', this.message)
    await this.parseMessageEval(evaluate, decode(this.message)); d('parseMessageEval: %s', this.message)
    await this.parseMessageOnline(online); d('parseMessageOnline: %s', this.message)
    await this.parseMessageCommand(command); d('parseMessageCommand: %s', this.message)
    await this.parseMessageEach(random); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(price); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(param); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(qs); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(info); d('parseMessageEach: %s', this.message)
    await this.parseMessageEach(list); d('parseMessageEach: %s', this.message)
    await this.parseMessageApi(); d('parseMessageApi: %s', this.message)
    await this.parseMessageEach(ifp, false); d('parseMessageEach: %s', this.message)

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
        _.each(rData, function (tag) {
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
        })
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
