'use strict'

// 3rdparty libraries
const _ = require('lodash')
const cluster = require('cluster')

const Expects = require('../expects.js')
const Game = require('./_interface')

class Heist extends Game {
  constructor () {
    const settings = {
      _: {
        startedAt: null,
        lastAnnouncedLevel: null,
        lastHeistTimestamp: null,
        lastAnnouncedCops: null,
        lastAnnouncedHeistInProgress: null,
        lastAnnouncedStart: null
      },
      options: {
        showMaxUsers: 20,
        copsCooldownInMinutes: 10,
        entryCooldownInSeconds: 120
      },
      notifications: {
        started: global.translate('games.heist.started'),
        nextLevelMessage: global.translate('games.heist.levelMessage'),
        maxLevelMessage: global.translate('games.heist.maxLevelMessage'),
        copsOnPatrol: global.translate('games.heist.copsOnPatrol'),
        copsCooldown: global.translate('games.heist.copsCooldownMessage')
      },
      results: {
        singleUserSuccess: global.translate('games.heist.singleUserSuccess'),
        singleUserFailed: global.translate('games.heist.singleUserFailed'),
        noUser: global.translate('games.heist.noUser'),
        data: [
          { percentage: 0, message: global.translate('games.heist.result.0') },
          { percentage: 33, message: global.translate('games.heist.result.33') },
          { percentage: 50, message: global.translate('games.heist.result.50') },
          { percentage: 99, message: global.translate('games.heist.result.99') },
          { percentage: 100, message: global.translate('games.heist.result.100') }
        ]
      },
      levels: {
        data: [
          {
            'name': global.translate('games.heist.levels.bankVan'),
            'winPercentage': 60,
            'payoutMultiplier': 1.5,
            'maxUsers': 5
          },
          {
            'name': global.translate('games.heist.levels.cityBank'),
            'winPercentage': 46,
            'payoutMultiplier': 1.7,
            'maxUsers': 10
          },
          {
            'name': global.translate('games.heist.levels.stateBank'),
            'winPercentage': 40,
            'payoutMultiplier': 1.9,
            'maxUsers': 20
          },
          {
            'name': global.translate('games.heist.levels.nationalReserve'),
            'winPercentage': 35,
            'payoutMultiplier': 2.1,
            'maxUsers': 30
          },
          {
            'name': global.translate('games.heist.levels.federalReserve'),
            'winPercentage': 31,
            'payoutMultiplier': 2.5,
            'maxUsers': 1000
          }
        ]
      },
      commands: [
        '!bankheist'
      ]
    }
    super({ settings })

    if (cluster.isMaster) this.timeouts['iCheckFinished'] = setTimeout(() => this.iCheckFinished(), 10000) // wait for proper config startup
  }

  async iCheckFinished () {
    clearTimeout(this.timeouts['iCheckFinished'])

    let [startedAt, entryCooldown, lastHeistTimestamp, copsCooldown, started] = await Promise.all([
      this.settings._.startedAt,
      this.settings.options.entryCooldownInSeconds,
      this.settings._.lastHeistTimestamp,
      this.settings.options.copsCooldownInMinutes,
      this.settings.notifications.started
    ])
    let levels = _.orderBy(await this.settings.levels.data, 'maxUsers', 'asc')

    // check if heist is finished
    if (!_.isNil(startedAt) && _.now() - startedAt > (entryCooldown * 1000) + 10000) {
      let users = await global.db.engine.find(this.collection.users)
      let level = _.find(levels, (o) => o.maxUsers >= users.length || _.isNil(o.maxUsers)) // find appropriate level or max level

      if (users.length === 0) {
        global.commons.sendMessage(await this.settings.results.noUser, global.commons.getOwner())
        // cleanup
        this.settings._.startedAt = null
        await global.db.engine.remove(this.collection.users, {})
        this.timeouts['iCheckFinished'] = setTimeout(() => this.iCheckFinished(), 10000)
        return
      }

      global.commons.sendMessage(started.replace('$bank', level.name), global.commons.getOwner())

      if (users.length === 1) {
        // only one user
        let isSurvivor = _.random(0, 100, false) <= level['winPercentage']
        let user = users[0]
        let outcome = isSurvivor ? await this.settings.results.singleUserSuccess : await this.settings.results.singleUserFailed
        setTimeout(async () => { global.commons.sendMessage(outcome.replace('$user', (global.configuration.getValue('atUsername') ? '@' : '') + user.username), global.commons.getOwner()) }, 5000)

        if (isSurvivor) {
          // add points to user
          let points = parseInt((await global.db.engine.findOne(this.collection.users, { username: user.username })).points, 10)
          await global.db.engine.insert('users.points', { id: user.id, points: parseInt(parseFloat(points * level.payoutMultiplier).toFixed(), 10) })
        }
      } else {
        let winners = []
        for (let user of users) {
          let isSurvivor = _.random(0, 100, false) <= level.winPercentage

          if (isSurvivor) {
            // add points to user
            let points = parseInt((await global.db.engine.findOne(this.collection.users, { username: user.username })).points, 10)
            await global.db.engine.insert('users.points', { id: user.id, points: parseInt(parseFloat(points * level.payoutMultiplier).toFixed(), 10) })
            winners.push(user.username)
          }
        }
        let percentage = (100 / users.length) * winners.length
        let ordered = _.orderBy(await this.settings.results.data, [(o) => parseInt(o.percentage)], 'asc')
        let result = _.find(ordered, (o) => o.percentage >= percentage)
        setTimeout(async () => { global.commons.sendMessage(_.isNil(result) ? '' : result.message, global.commons.getOwner()) }, 5000)
        if (winners.length > 0) {
          setTimeout(async () => {
            winners = _.chunk(winners, await this.settings.options.showMaxUsers)
            let winnersList = winners.shift()
            let andXMore = _.flatten(winners).length

            let message = await global.translate('games.heist.results')
            message = message.replace('$users', winnersList.map((o) => (global.configuration.getValue('atUsername') ? '@' : '') + o).join(', '))
            if (andXMore > 0) message = message + ' ' + (await global.translate('games.heist.andXMore')).replace('$count', andXMore)
            global.commons.sendMessage(message, global.commons.getOwner())
          }, 5500)
        }
      }

      // cleanup
      this.settings._.startedAt = null
      this.settings._.lastHeistTimestamp = _.now()
      await global.db.engine.remove(this.collection.users, {})
    }

    // check if cops done patrolling
    if (!_.isNil(lastHeistTimestamp) && _.now() - lastHeistTimestamp >= copsCooldown * 60000) {
      this.settings._.lastHeistTimestamp = null
      global.commons.sendMessage((await this.settings.notifications.copsCooldown), global.commons.getOwner())
    }
    this.timeouts['iCheckFinished'] = setTimeout(() => this.iCheckFinished(), 10000)
  }

  async main (opts) {
    const expects = new Expects()

    let [startedAt, entryCooldown, lastHeistTimestamp, copsCooldown] = await Promise.all([
      this.settings._.startedAt,
      this.settings.options.entryCooldownInSeconds,
      this.settings._.lastHeistTimestamp,
      this.settings.options.copsCooldownInMinutes
    ])
    let levels = _.orderBy(await this.settings.levels.data, 'maxUsers', 'asc')

    // is cops patrolling?
    if (_.now() - lastHeistTimestamp < copsCooldown * 60000) {
      let minutesLeft = Number.parseFloat(copsCooldown - (_.now() - lastHeistTimestamp) / 60000).toFixed(1)
      if (_.now() - (await this.settings._.lastAnnouncedCops) >= 60000) {
        this.settings._.lastAnnouncedCops = _.now()
        global.commons.sendMessage(
          (await this.settings.notifications.copsOnPatrol)
            .replace('$cooldown', minutesLeft + ' ' + global.commons.getLocalizedName(minutesLeft, 'core.minutes')), opts.sender)
      }
      return
    }

    let newHeist = false
    if (_.isNil(startedAt)) { // new heist
      newHeist = true
      this.settings._.startedAt = _.now() // set startedAt
      await global.db.engine.update(this.collection.data, { key: 'startedAt' }, { value: startedAt })
      if (_.now() - (await this.settings._.lastAnnouncedStart) >= 60000) {
        this.settings._.lastAnnouncedStart = _.now()
        global.commons.sendMessage((await global.translate('games.heist.entryMessage')).replace('$command', opts.command), opts.sender)
      }
    }

    // is heist in progress?
    if (!newHeist && _.now() - startedAt > entryCooldown * 1000 && _.now() - (await this.settings._.lastAnnouncedHeistInProgress) >= 60000) {
      this.settings._.lastAnnouncedHeistInProgress = _.now()
      global.commons.sendMessage(
        (await global.translate('games.heist.lateEntryMessage')).replace('$command', opts.command), opts.sender)
      return
    }

    let points
    try {
      points = expects.check(opts.parameters).points().toArray()[0]
    } catch (e) {
      if (!newHeist) {
        global.commons.sendMessage(
          (await global.translate('games.heist.entryInstruction')).replace('$command', opts.command), opts.sender)
        global.log.warning(`${opts.command} ${e.message}`)
      }
      return
    }

    points = points === 'all' && !_.isNil(await global.systems.points.getPointsOf(opts.sender.userId)) ? await global.systems.points.getPointsOf(opts.sender.userId) : parseInt(points, 10) // set all points
    points = points > await global.systems.points.getPointsOf(opts.sender.userId) ? await global.systems.points.getPointsOf(opts.sender.userId) : points // bet only user points

    if (points === 0 || _.isNil(points) || _.isNaN(points)) {
      global.commons.sendMessage(
        (await global.translate('games.heist.entryInstruction')).replace('$command', opts.command), opts.sender)
      return
    } // send entryInstruction if command is not ok

    await Promise.all([
      global.db.engine.insert('users.points', { id: opts.sender.userId, points: parseInt(points, 10) * -1 }), // remove points from user
      global.db.engine.update(this.collection.users, { id: opts.sender.userId }, { username: opts.sender.username, points: points }) // add user to heist list
    ])

    // check how many users are in heist
    let users = await global.db.engine.find(this.collection.users)
    let level = _.find(levels, (o) => o.maxUsers >= users.length || _.isNil(o.maxUsers))
    let nextLevel = _.find(levels, (o) => o.maxUsers > level.maxUsers)

    if (await this.settings._.lastAnnouncedLevel !== level.name) {
      this.settings._.lastAnnouncedLevel = level.name
      if (nextLevel) {
        global.commons.sendMessage(await this.settings.notifications.nextLevelMessage
          .replace('$bank', level.name)
          .replace('$nextBank', nextLevel.name, opts.sender))
      } else {
        global.commons.sendMessage(await this.settings.notifications.maxLevelMessage
          .replace('$bank', level.name), opts.sender)
      }
    }
  }
}

module.exports = new Heist()
