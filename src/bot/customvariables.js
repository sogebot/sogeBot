'use strict'

const _ = require('lodash')
const crypto = require('crypto')
const safeEval = require('safe-eval')
const axios = require('axios')
const {
  isMainThread
} = require('worker_threads');
const mathjs = require('mathjs')

const Message = require('./message')
import { permission } from './permissions';
const commons = require('./commons');

class CustomVariables {
  constructor () {
    this.timeouts = {}

    if (isMainThread) {
      this.addMenuAndListenersToPanel()
      this.checkIfCacheOrRefresh()
      global.db.engine.index('custom.variables.history', [{ index: 'cvarId' }])
    }
  }

  async addMenuAndListenersToPanel () {
    clearTimeout(this.timeouts[`${this.constructor.name}.addMenuAndListenersToPanel`])

    if (_.isNil(global.panel)) {
      this.timeouts[`${this.constructor.name}.addMenuAndListenersToPanel`] = setTimeout(() => this.addMenuAndListenersToPanel(), 1000)
    } else {
      global.panel.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables/list' })
      this.sockets()
    }
  }

  sockets () {
    const io = global.panel.io.of('/registry/customVariables')

    io.on('connection', (socket) => {
      socket.on('list.variables', async (cb) => {
        let variables = await global.db.engine.find('custom.variables')
        cb(null, variables)
      })
      socket.on('run.script', async (_id, cb) => {
        let item
        try {
          item = await global.db.engine.findOne('custom.variables', { _id: String(_id) })
          item = await global.db.engine.update('custom.variables', { _id: String(_id) }, { currentValue: await this.runScript(item.evalValue, { _current: item.currentValue }), runAt: Date.now() })
        } catch (e) {
          cb(e.stack, null)
        }
        cb(null, item)
      })
      socket.on('test.script', async (opts, cb) => {
        let returnedValue
        try {
          returnedValue = await this.runScript(opts.evalValue, { _current: opts.currentValue, sender: { username: 'testuser', userId: '0' }})
        } catch (e) {
          cb(e.stack, null)
        }
        cb(null, returnedValue)
      })
      socket.on('isUnique', async (variable, cb) => {
        cb(null, _.isEmpty(await global.db.engine.findOne('custom.variables', { variableName: String(variable) })))
      })
      socket.on('delete', async (id, cb) => {
        await global.db.engine.remove('custom.variables', { _id: String(id) })
        await global.db.engine.remove('custom.variables.watch', { variableId: String(id) }) // force unwatch
        this.updateWidgetAndTitle()
        cb()
      })
      socket.on('load', async (id, cb) => {
        const variable = await global.db.engine.findOne('custom.variables', { _id: String(id) })
        const history = await global.db.engine.find('custom.variables.history', { cvarId: String(id) })
        cb({variable, history})
      })
      socket.on('save', async (data, cb) => {
        var _id
        try {
          if (!_.isNil(data._id)) {
            _id = String(data._id); delete (data._id)
            await global.db.engine.update('custom.variables', { _id }, data)
            this.updateWidgetAndTitle(data.variableName)
          } else {
            delete (data._id)
            let item = await global.db.engine.insert('custom.variables', data)
            _id = String(item._id)
            this.updateWidgetAndTitle(data.variableName)
          }
          cb(null, _id)
        } catch (e) {
          cb(e.stack, _id)
        }
      })
    })
  }

  async runScript (script, opts) {
    let sender = !_.isNil(opts.sender) ? opts.sender : null
    let param = !_.isNil(opts.param) ? opts.param : null

    if (typeof sender === 'string') {
      sender = {
        username: sender,
        userId: await global.users.getIdByName(sender)
      }
    }

    // we need to check +1 variables, as they are part of commentary
    const containUsers = !_.isNil(script.match(/users/g)) && script.match(/users/g).length > 1
    const containRandom = !_.isNil(script.replace(/Math\.random|_\.random/g, '').match(/random/g));
    const containOnline = !_.isNil(script.match(/online/g))

    let users = []
    if (containUsers || containRandom) {
      users = await global.users.getAll()
    }

    let onlineViewers = []
    let onlineSubscribers = []
    let onlineFollowers = []

    if (containOnline) {
      onlineViewers = await global.db.engine.find('users.online')

      for (let viewer of onlineViewers) {
        let user = await global.db.engine.find('users', { username: viewer.username, is: { subscriber: true } })
        if (!_.isEmpty(user)) onlineSubscribers.push(user.username)
      }

      for (let viewer of onlineViewers) {
        let user = await global.db.engine.find('users', { username: viewer.username, is: { follower: true } })
        if (!_.isEmpty(user)) onlineFollowers.push(user.username)
      }
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

    // get custom variables
    const customVariablesDb = await global.db.engine.find('custom.variables');
    const customVariables = {}
    for (const cvar of customVariablesDb) {
      customVariables[cvar.variableName] = cvar.currentValue
    }

    // update globals and replace theirs values
    script = (await new Message(script).global({ escape: "'" }))

    let toEval = `(async function evaluation () {  ${script} })()`
    let context = {
      url: async (url, opts) => {
        if (typeof opts === 'undefined') {
          opts = {
            url,
            method: 'GET',
            headers: undefined,
            data: undefined,
          }
        } else {
          opts.url = url
        }

        if (!['GET', 'POST', 'PUT', 'DELETE'].includes(opts.method.toUpperCase())) {
          throw Error('only GET, POST, PUT, DELETE methods are supported')
        }

        if (opts.url.trim().length === 0) {
          throw Error('url was not properly specified')
        }

        const request = await axios(opts)
        return { data: request.data, status: request.status, statusText: request.statusText };
      },
      _: _,
      users: users,
      random: randomVar,
      stream: {
        uptime: commons.getTime((await global.cache.when()).online, false),
        currentViewers: _.get((await global.db.engine.findOne('api.current', {
          key: 'viewers'
        })), 'value', 0),
        currentSubscribers: _.get((await global.db.engine.findOne('api.current', {
          key: 'subscribers'
        })), 'value', 0),
        currentBits: _.get((await global.db.engine.findOne('api.current', {
          key: 'bits'
        })), 'value', 0),
        currentTips: _.get((await global.db.engine.findOne('api.current', {
          key: 'tips'
        })), 'value', 0),
        currency: global.currency.symbol(global.currency.mainCurrency),
        chatMessages: (await global.cache.isOnline()) ? global.linesParsed - global.api.chatMessagesAtStart : 0,
        currentFollowers: _.get((await global.db.engine.findOne('api.current', {
          key: 'followers'
        })), 'value', 0),
        currentViews: _.get((await global.db.engine.findOne('api.current', {
          key: 'views'
        })), 'value', 0),
        maxViewers: _.get((await global.db.engine.findOne('api.max', {
          key: 'viewers'
        })), 'value', 0),
        newChatters: _.get((await global.db.engine.findOne('api.new', {
          key: 'chatters'
        })), 'value', 0),
        game: _.get((await global.db.engine.findOne('api.current', {
          key: 'game'
        })), 'value', null),
        status: _.get((await global.db.engine.findOne('api.current', {
          key: 'title'
        })), 'value', null),
        currentHosts: _.get((await global.db.engine.findOne('api.current', {
          key: 'hosts'
        })), 'value', 0),
        currentWatched: global.api._stream.watchedTime
      },
      sender,
      param: param,
      _current: opts._current,
      user: async (username) => {
        const _user = await global.users.getByName(username);
        const userObj = {
          username,
          id: await global.users.getIdByName(username, false),
          is: {
            online: (await global.db.engine.find('users.online', { username })).length > 0,
            follower: _.get(_user, 'is.follower', false),
            vip: _.get(_user, 'is.vip', false),
            subscriber: _.get(_user, 'is.subscriber', false),
            mod: await commons.isModerator(username)
          }
        }
        return userObj;
      },
      ...customVariables,
    }
    return (safeEval(toEval, context))
  }

  async isVariableSet (variableName) {
    let item = await global.db.engine.findOne('custom.variables', { variableName })
    return !_.isEmpty(item) ? String(item._id) : null
  }

  async isVariableSetById (_id) {
    let item = await global.db.engine.findOne('custom.variables', { _id })
    return !_.isEmpty(item) ? String(item.variableName) : null
  }

  async getValueOf (variableName, opts) {
    if (!variableName.startsWith('$_')) variableName = `$_${variableName}`
    let item = await global.db.engine.findOne('custom.variables', { variableName })
    if (_.isEmpty(item)) return '' // return empty if variable doesn't exist

    if (item.type === 'eval' && Number(item.runEvery) === 0) {
      item.currentValue = await this.runScript(item.evalValue, {
        _current: item.currentValue,
        ...opts
      })
      await global.db.engine.update('custom.variables', { variableName }, { currentValue: item.currentValue, runAt: Date.now() })
    }

    return item.currentValue
  }

  /* Sets value of variable with proper checks
   *
   * @return object
   * { updated, isOK }
   */
  async setValueOf (variableName, currentValue, opts) {
    let item = await global.db.engine.findOne('custom.variables', { variableName })
    let isOk = true
    let isEval = false
    let oldValue = null

    opts.sender = _.isNil(opts.sender) ? null : opts.sender
    opts.readOnlyBypass = _.isNil(opts.readOnlyBypass) ? false : opts.readOnlyBypass
    // add simple text variable, if not existing
    if (_.isEmpty(item)) {
      item = await global.db.engine.insert('custom.variables', { variableName, currentValue, type: 'text', responseType: 0, permission: permission.MODERATORS })
    } else {
      // set item permission to owner if missing
      item.permission = typeof item.permission === 'undefined' ? permission.CASTERS : item.permission;
      let [isVIP, isMod, isOwner] = await Promise.all([
        commons.isVIP(opts.sender),
        commons.isModerator(opts.sender),
        commons.isOwner(opts.sender)
      ])

      if (typeof opts.sender === 'string') {
        opts.sender = {
          username: opts.sender,
          userId: await global.users.getIdByName(opts.sender)
        }
      }
      const permissionsAreValid = _.isNil(opts.sender) || (await global.permissions.check(opts.sender.userId, item.permission)).access;
      if ((item.readOnly && !opts.readOnlyBypass) || !permissionsAreValid) {
        isOk = false
      } else {
        oldValue = item.currentValue
        if (item.type === 'number') {
          if (['+', '-'].includes(currentValue)) {
            currentValue = mathjs.eval(`${item.currentValue} ${currentValue} 1`)
          } else {
            const isNumber = _.isFinite(Number(currentValue))
            isOk = isNumber
            currentValue = isNumber ? Number(currentValue) : item.currentValue
          }
        } else if (item.type === 'options') {
          // check if is in usableOptions
          let isUsableOption = item.usableOptions.split(',').map((o) => o.trim()).includes(currentValue)
          isOk = isUsableOption
          currentValue = isUsableOption ? currentValue : item.currentValue
        } else if (item.type === 'eval') {
          opts.param = currentValue
          item.currentValue = await this.getValueOf(variableName, opts)
          isEval = true
        }
        // do update only on non-eval variables
        if (item.type !== 'eval' && isOk) item = await global.db.engine.update('custom.variables', { variableName }, { currentValue })
      }
    }

    item.setValue = item.currentValue
    if (isOk) {
      this.updateWidgetAndTitle(variableName)
      if (!isEval) {
        this.addChangeToHistory({ sender: _.get(opts, 'sender.username', null), item, oldValue })
        item.currentValue = '' // be silent if parsed correctly
      }
    }
    return { updated: item, isOk, isEval }
  }

  async addChangeToHistory(opts) {
    await global.db.engine.insert('custom.variables.history', { cvarId: String(opts.item._id), sender: opts.sender, oldValue: opts.oldValue, currentValue: opts.item.currentValue, timestamp: String(new Date())})
  }

  async checkIfCacheOrRefresh () {
    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`])
    let items = await global.db.engine.find('custom.variables', { type: 'eval' })

    for (let item of items) {
      try {
        item.runAt = _.isNil(item.runAt) ? 0 : item.runAt
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery
        if (shouldRun) {
          let newValue = await this.runScript(item.evalValue, { _current: item.currentValue })
          await global.db.engine.update('custom.variables', { _id: String(item._id) }, { runAt: Date.now(), currentValue: newValue })
          await this.updateWidgetAndTitle(item.variableName)
        }
      } catch (e) {} // silence errors
    }
    this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`] = setTimeout(() => this.checkIfCacheOrRefresh(), 1000)
  }

  async updateWidgetAndTitle (variable) {
    if (!isMainThread) {
      global.workers.sendToMaster({ type: 'widget_custom_variables', emit: 'refresh' })
    } else if (!_.isNil(global.widgets.custom_variables.socket)) global.widgets.custom_variables.socket.emit('refresh') // send update to widget

    if (!_.isNil(variable)) {
      const regexp = new RegExp(`\\${variable}`, 'ig')
      let title = await global.cache.rawStatus()

      if (title.match(regexp)) {
        if (!isMainThread) {
          global.workers.sendToMaster({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [null] })
        } else {
          global.api.setTitleAndGame(null)
        }
      }
    }
  }
}

module.exports = CustomVariables
