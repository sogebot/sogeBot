'use strict'

const _ = require('lodash')
const debug = require('debug')
const crypto = require('crypto')
const safeEval = require('safe-eval')
const axios = require('axios')
const cluster = require('cluster')
const mathjs = require('mathjs')
const XRegExp = require('xregexp')

const Timeout = require('./timeout')
const Message = require('./message')

const DEBUG = {
  SOCKETS: debug('events:sockets'),
  SCRIPT: debug('events:runScript')
}

class CustomVariables {
  constructor () {
    if (cluster.isMaster) {
      this.addMenuAndListenersToPanel()
      this.checkIfCacheOrRefresh()
    }
  }

  async addMenuAndListenersToPanel () {
    if (_.isNil(global.panel)) return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.addMenuAndListenersToPanel`, wait: 1000, fnc: this.addMenuAndListenersToPanel })
    global.panel.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables' })
    this.sockets()
  }

  sockets () {
    const io = global.panel.io.of('/registry/customVariables')

    io.on('connection', (socket) => {
      DEBUG.SOCKETS('Socket /registry/customVariables connected, registering sockets')
      socket.on('list.variables', async (cb) => {
        let variables = await global.db.engine.find('custom.variables')
        cb(null, variables); DEBUG.SOCKETS('list.variables => %j', variables)
      })
      socket.on('run.script', async (_id, cb) => {
        let item
        try {
          item = await global.db.engine.findOne('custom.variables', { _id: String(_id) })
          item = await global.db.engine.update('custom.variables', { _id: String(_id) }, { currentValue: await this.runScript(item.evalValue, {}), runAt: new Date() })
        } catch (e) {
          cb(e.stack, null)
        }
        cb(null, item)
      })
      socket.on('test.script', async (script, cb) => {
        let returnedValue
        try {
          returnedValue = await this.runScript(script, { sender: 'TestUser' })
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
        let variable = await global.db.engine.findOne('custom.variables', { _id: String(id) })
        cb(variable); DEBUG.SOCKETS('load => %j', variable)
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
    DEBUG.SCRIPT('Start')
    DEBUG.SCRIPT(script)

    let sender = !_.isNil(opts.sender) ? opts.sender : null
    let param = !_.isNil(opts.param) ? opts.param : null

    // we need to check +1 variables, as they are part of commentary
    const containUsers = !_.isNil(script.match(/users/g)) && script.match(/users/g).length > 1
    const containRandom = !_.isNil(script.replace(/Math\.random|_\.random/g, '').match(/random/g)) && script.match(/users/g).length > 1
    const containOnline = !_.isNil(script.match(/online/g))
    const containUrl = !_.isNil(script.match(/url\(['"](.*?)['"]\)/g))
    DEBUG.SCRIPT('contain users: %s', containUsers)
    DEBUG.SCRIPT('contain random: %s', containRandom)
    DEBUG.SCRIPT('contain online: %s', containOnline)
    DEBUG.SCRIPT('contain url: %s', containUrl)

    if (!_.isNil(script.match(/(\$_[a-zA-Z_]+)/g))) {
      for (let match of script.match(/(\$_[a-zA-Z_]+)/g)) {
        script = script.replace(match, await this.getValueOf(match))
      }
    }

    let urls = []
    if (containUrl) {
      for (let match of script.match(/url\(['"](.*?)['"]\)/g)) {
        const id = 'url' + crypto.randomBytes(64).toString('hex').slice(0, 5)
        const url = match.replace(/url\(['"]|["']\)/g, '')
        let response = await axios.get(url)
        urls.push({ id, response })
        script = script.replace(match, id)
      }
    }

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

    // get custom variables replace theirs values
    let match = script.match(new RegExp('\\$!?_([a-zA-Z0-9_]+)', 'g'))
    if (match) {
      for (let variable of match.sort((a, b) => b.length - a.length)) {
        script = script.replace(new RegExp(XRegExp.escape(variable), 'g'), await this.getValueOf(variable.replace('$!_', ''), opts))
      }
    }
    // update globals and replace theirs values
    script = (await new Message(script).global({ escape: "'" }))

    let toEval = `(function evaluation () {  ${script} })()`
    let context = {
      _: _,
      users: users,
      random: randomVar,
      sender: await global.configuration.getValue('atUsername') ? `@${sender}` : `${sender}`,
      param: param
    }

    if (containUrl) {
      // add urls to context
      for (let url of urls) {
        context[url.id] = url.response
      }
    }
    DEBUG.SCRIPT(toEval); return (safeEval(toEval, context))
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
      item.currentValue = await this.runScript(item.evalValue, opts)
      await global.db.engine.update('custom.variables', { variableName }, { currentValue: item.currentValue, runAt: new Date() })
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

    opts.sender = _.isNil(opts.sender) ? null : opts.sender
    opts.readOnlyBypass = _.isNil(opts.readOnlyBypass) ? false : opts.readOnlyBypass

    // add simple text variable, if not existing
    if (_.isEmpty(item)) {
      item = await global.db.engine.insert('custom.variables', { variableName, currentValue, type: 'text', responseType: 0 })
    } else {
      if (item.readOnly && !opts.readOnlyBypass) {
        isOk = false
      } else {
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

    if (isOk) this.updateWidgetAndTitle(variableName)
    return { updated: item, isOk, isEval }
  }

  async checkIfCacheOrRefresh () {
    let items = await global.db.engine.find('custom.variables', { type: 'eval' })

    for (let item of items) {
      try {
        item.runAt = _.isNil(item.runAt) ? 0 : item.runAt
        const shouldRun = item.runEvery > 0 && new Date().getTime() - new Date(item.runAt).getTime() >= item.runEvery
        if (shouldRun) {
          let newValue = await this.runScript(item.evalValue, {})
          await global.db.engine.update('custom.variables', { _id: String(item._id) }, { runAt: new Date(), currentValue: newValue })
          await this.updateWidgetAndTitle(item.variableName)
        }
      } catch (e) {} // silence errors
    }
    return new Timeout().recursive({ this: this, uid: `${this.constructor.name}.checkIfCacheOrRefresh`, wait: 1000, fnc: this.checkIfCacheOrRefresh })
  }

  async updateWidgetAndTitle (variable) {
    if (cluster.isWorker) process.send({ type: 'widget_custom_variables', emit: 'refresh' })
    else if (!_.isNil(global.widgets.custom_variables.socket)) global.widgets.custom_variables.socket.emit('refresh') // send update to widget

    if (!_.isNil(variable)) {
      const regexp = new RegExp(`\\${variable}`, 'ig')
      let title = await global.cache.rawStatus()

      if (title.match(regexp)) {
        if (cluster.isWorker) process.send({ type: 'call', ns: 'api', fnc: 'setTitleAndGame', args: [null] })
        else global.api.setTitleAndGame(null)
      }
    }
  }
}

module.exports = CustomVariables
