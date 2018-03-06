'use strict'

// 3rdparty libraries
const _ = require('lodash')
const chalk = require('chalk')
const debug = require('debug')

const Expects = require('../expects.js')
const constants = require('../constants.js')

class Heist {
  constructor () {
    this.collection = 'games.heist'

    this._lastAnnouncedLevel = null
    this._lastAnnouncedCops = null
    this._lastAnnouncedHeistInProgress = null
    this._lastAnnouncedStart = null

    this.enabled = true
    this.startedAt = null
    this.lastHeistTimestamp = null

    this.command = '!bankheist'
    this.copsCooldown = 10 // minutes
    this.entryCooldown = 120 // seconds
    this.showMaxUsers = 20

    global.panel.addMenu({category: 'settings', name: 'games', id: 'games'})
    global.parser.registerParser(this, 'heist', this.run, constants.VIEWERS)

    this.status()
    this.sockets()

    setTimeout(() => Promise.all([this.levels, this.results]), 5000) // init levels and results

    // intervals
    setTimeout(() => this.iCheckFinished(), 10000) // wait for proper config startup
  }

  get andXMore () { return global.translate('games.heist.andXMore') }
  get entryMessage () { return global.translate('games.heist.entryMessage') }
  get started () { return global.translate('games.heist.started') }
  get lateEntryMessage () { return global.translate('games.heist.lateEntryMessage') }
  get entryInstruction () { return global.translate('games.heist.entryInstruction') }
  get copsOnPatrol () { return global.translate('games.heist.copsOnPatrol') }
  get copsCooldownMessage () { return global.translate('games.heist.copsCooldownMessage') }
  get maxLevelMessage () { return global.translate('games.heist.maxLevelMessage') }
  get levels () {
    return new Promise(async (resolve, reject) => {
      let [defaults, levels] = await Promise.all([
        global.db.engine.findOne(`${this.collection}`, { key: 'defaultLevelsSet' }),
        global.db.engine.find(`${this.collection}.levels`)
      ])

      if (_.isEmpty(levels) && _.isEmpty(defaults)) {
        let defaultLevels = [
          {
            'name': global.translate('games.heist.levels.bankVan'),
            'message': '',
            'win%': 60,
            'payoutMultiplier': 1.5,
            'maxUsers': 5
          },
          {
            'name': global.translate('games.heist.levels.cityBank'),
            'message': global.translate('games.heist.levelMessage'),
            'win%': 46,
            'payoutMultiplier': 1.7,
            'maxUsers': 10
          },
          {
            'name': global.translate('games.heist.levels.stateBank'),
            'message': global.translate('games.heist.levelMessage'),
            'win%': 40,
            'payoutMultiplier': 1.9,
            'maxUsers': 20
          },
          {
            'name': global.translate('games.heist.levels.nationalReserve'),
            'message': global.translate('games.heist.levelMessage'),
            'win%': 35,
            'payoutMultiplier': 2.1,
            'maxUsers': 30
          },
          {
            'name': global.translate('games.heist.levels.federalReserve'),
            'message': global.translate('games.heist.maxLevelMessage'),
            'win%': 31,
            'payoutMultiplier': 2.5
          }
        ]
        // if no levels are set
        await Promise.all([
          global.db.engine.update(`${this.collection}`, { key: 'defaultLevelsSet' }, { value: true }),
          global.db.engine.insert(`${this.collection}.levels`, defaultLevels)
        ])

        // return default levels if nothing in db
        resolve(defaultLevels)
      } else {
        resolve(levels)
      }
    })
  }
  get results () {
    return new Promise(async (resolve, reject) => {
      let [defaults, results] = await Promise.all([
        global.db.engine.findOne(`${this.collection}`, { key: 'defaultResultsSet' }),
        global.db.engine.find(`${this.collection}.results`)
      ])

      if (_.isEmpty(results) && _.isEmpty(defaults)) {
        let defaultResults = [
          { percentage: 0, message: global.translate('games.heist.result.0') },
          { percentage: 33, message: global.translate('games.heist.result.33') },
          { percentage: 50, message: global.translate('games.heist.result.50') },
          { percentage: 99, message: global.translate('games.heist.result.99') },
          { percentage: 100, message: global.translate('games.heist.result.100') }
        ]
        // if no results are set
        await Promise.all([
          global.db.engine.update(`${this.collection}`, { key: 'defaultResultsSet' }, { value: true }),
          global.db.engine.insert(`${this.collection}.results`, defaultResults)
        ])

        // return default results if nothing in db
        resolve(defaultResults)
      } else {
        resolve(results)
      }
    })
  }
  get outcomes () {
    return {
      'singleUserSuccess': global.translate('games.heist.singleUserSuccess'),
      'singleUserFailed': global.translate('games.heist.singleUserFailed'),
      'noUser': global.translate('games.heist.noUser'),
      'results': global.translate('games.heist.results')
    }
  }

  sockets () {
    const d = debug('events:sockets')
    const io = global.panel.io.of('/games/heist')

    io.on('connection', (socket) => {
      d('Socket /games/heist connected, registering sockets')
      socket.on('set.default', async (key, callback) => {
        let root = key
        let value

        if (root === 'levels') {
          // set default levels
          await Promise.all([
            global.db.engine.remove(`${this.collection}`, { key: 'defaultLevelsSet' }),
            global.db.engine.remove(`${this.collection}.levels`, {})
          ])
          value = await this.levels // re-load levels
        } else if (root === 'results') {
          // set default results
          await Promise.all([
            global.db.engine.remove(`${this.collection}`, { key: 'defaultResultsSet' }),
            global.db.engine.remove(`${this.collection}.results`, {})
          ])
          value = await this.results // re-load results
        } else if (key.indexOf('.') > -1) {
          // get root of key if applicable and set proper value
          [root, key] = key.split('.')
          value = _.get(this[root], key) // get default value
          let values = await global.db.engine.findOne(this.collection, { key: root })
          _.set(values.value, key, value)
          await global.db.engine.update(this.collection, { key: root }, { value: values.value })
        } else {
          // simply delete if its simple key=value pair
          value = this[root]
          await global.db.engine.remove(this.collection, { key: root })
        }
        callback(null, value)
      })
      socket.on('add.result', async (callback) => {
        let result = await global.db.engine.insert(`${this.collection}.results`, { message: global.translate('games.heist.result.99'), percentage: 1 })
        callback(null, result)
      })
      socket.on('remove.result', async (id, callback) => {
        await global.db.engine.remove(`${this.collection}.results`, { _id: id })
        callback(null, id)
      })
      socket.on('set.variable', async (data, callback) => {
        let key = data.key
        let root = data.key
        let value = data.value

        if (root.startsWith('level')) {
          const id = root.split('.')[1]
          let update = {}
          update[root.split('.')[2]] = data.value
          await global.db.engine.update(`${this.collection}.levels`, { _id: id }, update)
          callback(null, data.value)
          return
        }

        if (root.startsWith('results')) {
          data.value = root.split('.')[2] === 'percentage' ? parseInt(data.value, 10) : data.value
          const id = root.split('.')[1]
          let update = {}
          update[root.split('.')[2]] = data.value
          await global.db.engine.update(`${this.collection}.results`, { _id: id }, update)
          callback(null, data.value)
          return
        }

        // get root of key if applicable and set proper value
        if (key.indexOf('.') > -1) {
          [root, key] = key.split('.')
          value = await this.get(root)
          value[key] = data.value
        }

        await global.db.engine.update(this.collection, { key: root }, { value: value })
        callback(null, data.value)
      })
      socket.on('toggle.enabled', async (callback) => {
        const enabled = !(await this.get('enabled'))
        await global.db.engine.update(this.collection, { key: 'enabled' }, { value: enabled })
        callback(null, enabled)
      })
      socket.on('load.variable', async (variable, callback) => {
        if (variable === 'levels' || variable === 'results') callback(null, await this[variable])
        else callback(null, await this.get(variable))
      })
      socket.on('load.settings', async (callback) => {
        callback(null, {
          enabled: await this.get('enabled'),
          command: await this.get('command'),
          copsCooldown: await this.get('copsCooldown'),
          entryCooldown: await this.get('entryCooldown'),
          showMaxUsers: await this.get('showMaxUsers'),
          started: await this.get('started')
        })
      })
    })
  }

  async iCheckFinished () {
    const d = debug('heist:iCheckFinished')
    d('Checking if heist is finished')
    let [startedAt, entryCooldown, outcomes, levels, lastHeistTimestamp, copsCooldown, started, results] = await Promise.all([
      this.get('startedAt'),
      this.get('entryCooldown'),
      this.get('outcomes'),
      this.levels,
      this.get('lastHeistTimestamp'),
      this.get('copsCooldown'),
      this.get('started'),
      this.results
    ])
    levels = _.orderBy(levels, 'maxUsers', 'asc')

    d('startedAt: %s', startedAt)
    d('entryCooldown: %s', entryCooldown)
    d('How long ago started: %s', _.now() - startedAt)
    d('Expected heist close: %s', (entryCooldown * 1000) + 10000)

    // check if heist is finished
    if (!_.isNil(startedAt) && _.now() - startedAt > (entryCooldown * 1000) + 10000) {
      let users = await global.db.engine.find(`${this.collection}.users`)
      let level = _.find(levels, (o) => o.maxUsers >= users.length || _.isNil(o.maxUsers)) // find appropriate level or max level

      if (users.length === 0) {
        global.commons.sendMessage(outcomes.noUser, global.parser.getOwner())
        // cleanup
        await global.db.engine.remove(this.collection, { key: 'startedAt' })
        await global.db.engine.remove(`${this.collection}.users`, {})
        setTimeout(() => this.iCheckFinished(), 10000)
        return
      }

      global.commons.sendMessage(started.replace('$bank', level.name), global.parser.getOwner())

      d('Closing heist ----------')
      d('Users: %s', users.length)
      d('Win probablity:%s%', level['win%'])

      if (users.length === 1) {
        // only one user
        let isSurvivor = _.random(0, 100, false) <= level['win%']
        let user = users[0]
        let outcome = isSurvivor ? outcomes.singleUserSuccess : outcomes.singleUserFailed
        setTimeout(() => { global.commons.sendMessage(outcome.replace('$user', (global.configuration.getValue('atUsername') ? '@' : '') + user.username), global.parser.getOwner()) }, 5000)

        if (isSurvivor) {
          // add points to user
          await global.db.engine.incrementOne('users', { username: user.username }, { points: parseInt(parseFloat(user.points * level.payoutMultiplier).toFixed(), 10) })
        }
      } else {
        let winners = []
        for (let user of users) {
          let isSurvivor = _.random(0, 100, false) <= level['win%']

          if (isSurvivor) {
            // add points to user
            await global.db.engine.incrementOne('users', { username: user.username }, { points: parseInt(parseFloat(user.points * level.payoutMultiplier).toFixed(), 10) })
            winners.push(user.username)
          }
        }
        let percentage = (100 / users.length) * winners.length
        let ordered = _.orderBy(results, [(o) => parseInt(o.percentage)], 'asc')
        let result = _.find(ordered, (o) => o.percentage >= percentage)
        setTimeout(() => { global.commons.sendMessage(_.isNil(result) ? '' : result.message, global.parser.getOwner()) }, 5000)
        if (winners.length > 0) {
          setTimeout(async () => {
            winners = _.chunk(winners, await this.get('showMaxUsers'))
            let winnersList = winners.shift()
            let andXMore = _.flatten(winners).length

            let message = outcomes.results.replace('$users', winnersList.map((o) => (global.configuration.getValue('atUsername') ? '@' : '') + o).join(', '))
            if (andXMore > 0) message = message + ' ' + (await this.get('andXMore')).replace('$count', andXMore)
            global.commons.sendMessage(message, global.parser.getOwner())
          }, 5500)
        }
      }

      // cleanup
      await global.db.engine.remove(this.collection, { key: 'startedAt' })
      await global.db.engine.remove(`${this.collection}.users`, {})

      // lastHeistTimestamp
      await global.db.engine.update(this.collection, { key: 'lastHeistTimestamp' }, { value: _.now() })
    }

    // check if cops done patrolling
    if (!_.isNil(lastHeistTimestamp) && _.now() - lastHeistTimestamp >= copsCooldown * 60000) {
      await global.db.engine.remove(this.collection, { key: 'lastHeistTimestamp' })
      global.commons.sendMessage((await this.get('copsCooldownMessage')), global.parser.getOwner())
    }
    setTimeout(() => this.iCheckFinished(), 10000)
  }

  async get (key) {
    let item = await global.db.engine.findOne(this.collection, { key: key })
    return _.get(item, 'value', _.clone(this[key]))
  }

  async status () {
    let enabled = await this.get('enabled')
    if (!global.commons.isSystemEnabled('points')) {
      enabled = false
      global.log.info(`${chalk.red('FORCE DISABLED')}: Heist Game. Dependency points system is ${chalk.red('disabled')}`)
    } else if (!enabled) {
      global.log.info(`${chalk.red('DISABLED')}: Heist Game`)
    } else {
      global.log.info(`${chalk.green('ENABLED')}: Heist Game`)
    }
    return enabled
  }

  async toggleEnable () {
    let enabled = !(await this.get('enabled'))
    await global.db.engine.update(this.collection, { key: 'enabled' }, { value: enabled })
    return this.status()
  }

  async run (self, id, sender, message) {
    const d = debug('heist:run')
    const expects = new Expects()

    global.updateQueue(id, true)

    if (!global.commons.isSystemEnabled('points')) return // is points system enabled?

    let [command, enabled, startedAt, entryCooldown, levels, lastHeistTimestamp, copsCooldown] = await Promise.all([
      self.get('command'),
      self.get('enabled'),
      self.get('startedAt'),
      self.get('entryCooldown'),
      self.levels,
      self.get('lastHeistTimestamp'),
      self.get('copsCooldown')
    ])
    levels = _.orderBy(levels, 'maxUsers', 'asc')

    if (!message.trim().toLowerCase().startsWith(command)) return // heist command?
    if (!enabled) return // enabled?

    // is cops patrolling?
    if (_.now() - lastHeistTimestamp < copsCooldown * 60000) {
      d('Minutes left: %s', copsCooldown - (_.now() - lastHeistTimestamp) / 60000)
      let minutesLeft = Number.parseFloat(copsCooldown - (_.now() - lastHeistTimestamp) / 60000).toFixed(1)
      if (_.now() - self._lastAnnouncedCops >= 60000) {
        self._lastAnnouncedCops = _.now()
        global.commons.sendMessage(
          (await self.get('copsOnPatrol'))
            .replace('$cooldown', minutesLeft + ' ' + global.parser.getLocalizedName(minutesLeft, 'core.minutes')), sender)
      }
      return
    }

    let newHeist = false
    if (_.isNil(startedAt)) { // new heist
      newHeist = true
      startedAt = _.now() // set startedAt
      await global.db.engine.update(self.collection, { key: 'startedAt' }, { value: startedAt })
      if (_.now() - self._lastAnnouncedStart >= 60000) {
        self._lastAnnouncedStart = _.now()
        global.commons.sendMessage(await self.get('entryMessage'), sender)
      }
    }

    // is heist in progress?
    if (_.now() - startedAt > entryCooldown * 1000 && _.now() - self._lastAnnouncedHeistInProgress >= 60000) {
      self._lastAnnouncedHeistInProgress = _.now()
      global.commons.sendMessage(
        (await self.get('lateEntryMessage')).replace('$command', command), sender)
      return
    }

    let points
    try {
      points = expects.check(message).command().points().toArray()[1]
    } catch (e) {
      if (!newHeist) {
        global.commons.sendMessage(
          (await self.get('entryInstruction')).replace('$command', command), sender)
        global.log.warning(`${command} ${e.message}`)
        d(e.stack)
      }
      return
    }

    const user = await global.users.get(sender.username)
    points = points === 'all' && !_.isNil(user.points) ? user.points : parseInt(points, 10) // set all points
    points = points > user.points ? user.points : points // bet only user points
    d(`${command} - ${sender.username} betting ${points}`)

    if (points === 0 || _.isNil(points) || _.isNaN(points)) return // ignore if 0 points or null (if all is used)

    await Promise.all([
      global.db.engine.incrementOne('users', { username: sender.username }, { points: parseInt(points, 10) * -1 }), // remove points from user
      global.db.engine.update(`${self.collection}.users`, { username: sender.username }, { points: points }) // add user to heist list
    ])

    // check how many users are in heist
    let users = await global.db.engine.find(`${self.collection}.users`)
    let level = _.find(levels, (o) => o.maxUsers >= users.length || _.isNil(o.maxUsers))
    let nextLevel = _.find(levels, (o) => o.maxUsers > level.maxUsers)

    if (self._lastAnnouncedLevel !== level.name) {
      self._lastAnnouncedLevel = level.name
      global.commons.sendMessage(level.message
        .replace('$bank', level.name)
        .replace('$nextBank', _.get(nextLevel, 'name', '')), sender)
    }
  }
}

module.exports = new Heist()
