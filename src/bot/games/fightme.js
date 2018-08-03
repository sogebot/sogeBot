'use strict'

// 3rdparty libraries
const _ = require('lodash')
const debug = require('debug')('game:fightme')

// bot libraries
const Game = require('./_interface')

/*
 * !fightme [user] - challenge [user] to fight
 */

class FightMe extends Game {
  constructor () {
    const settings = {
      _: {
        cooldown: String(new Date())
      },
      rewards: {
        winnerWillGet: 0,
        loserWillLose: 0
      },
      timeout: 10,
      cooldown: 0,
      bypassCooldownByOwnerAndMods: false,
      commands: [
        '!fightme'
      ]
    }
    super({ settings })
  }

  async main (opts) {
    opts.sender['message-type'] = 'chat' // force responses to chat
    var username

    debug(opts)
    try {
      username = opts.parameters.trim().match(/^@?([\S]+)$/)[1].toLowerCase()
      opts.sender.username = opts.sender.username.toLowerCase()
    } catch (e) {
      debug(e)
      global.commons.sendMessage(global.translate('gambling.fightme.notEnoughOptions'), opts.sender)
      return
    }

    if (opts.sender.username === username) {
      debug('cannotFightWithYourself')
      global.commons.sendMessage(global.translate('gambling.fightme.cannotFightWithYourself'), opts.sender)
      return
    }

    // check if you are challenged by user
    const challenge = await global.db.engine.findOne(this.collection.users, { key: '_users', user: username, challenging: opts.sender.username })
    const isChallenged = !_.isEmpty(challenge)
    if (isChallenged) {
      let winner = _.random(0, 1, false)
      let isMod = {
        user: await global.commons.isMod(username),
        sender: await global.commons.isMod(opts.sender)
      }

      // vs broadcaster
      if (global.commons.isBroadcaster(opts.sender) || global.commons.isBroadcaster(username)) {
        debug('vs broadcaster')
        global.commons.sendMessage(
          await global.commons.prepare('gambling.fightme.broadcaster', { winner: global.commons.isBroadcaster(opts.sender) ? opts.sender.username : username }),
          opts.sender)
        isMod = global.commons.isBroadcaster(opts.sender) ? isMod.user : isMod.sender
        if (!isMod) global.commons.timeout(global.commons.isBroadcaster(opts.sender) ? username : opts.sender.username, null, await this.settings.timeout)
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() })
        return
      }

      // mod vs mod
      if (isMod.user && isMod.sender) {
        debug('mod vs mod')
        global.commons.sendMessage(
          await global.commons.prepare('gambling.fightme.bothModerators', { challenger: username }),
          opts.sender)
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() })
        return
      }

      // vs mod
      if (isMod.user || isMod.sender) {
        debug('vs mod')
        global.commons.sendMessage(
          await global.commons.prepare('gambling.fightme.oneModerator', { winner: isMod.sender ? opts.sender.username : username }),
          opts.sender)
        global.commons.timeout(isMod.sender ? username : opts.sender.username, null, await this.settings.timeout)
        global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() })
        return
      }

      debug('user vs user')
      const [winnerWillGet, loserWillLose] = await Promise.all([this.settings.winnerWillGet, this.settings.loserWillLose])
      global.db.engine.insert('users.points', { username: winner ? opts.sender.username : username, points: Math.abs(Number(winnerWillGet)) })
      global.db.engine.insert('users.points', { username: !winner ? opts.sender.username : username, points: -Math.abs(Number(loserWillLose)) })

      global.commons.timeout(winner ? opts.sender.username : username, null, await this.settings.timeout)
      global.commons.sendMessage(await global.commons.prepare('gambling.fightme.winner', { username, winner: winner ? username : opts.sender.username }), opts.sender)
      global.db.engine.remove(this.collection.users, { _id: challenge._id.toString() })
    } else {
      // check if under gambling cooldown
      const cooldown = await this.settings.cooldown
      const isMod = await global.commons.isMod(opts.sender)
      if (new Date().getTime() - new Date(await this.settings._.cooldown).getTime() < cooldown * 1000 &&
        !(await this.settings.bypassCooldownByOwnerAndMods && (isMod || global.commons.isBroadcaster(opts.sender)))) {
        debug('cooldown')
        global.commons.sendMessage(global.translate('gambling.fightme.cooldown')
          .replace(/\$cooldown/g, Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(await this.settings._.cooldown).getTime())) / 1000 / 60))
          .replace(/\$minutesName/g, global.commons.getLocalizedName(Math.round(((cooldown * 1000) - (new Date().getTime() - new Date(await this.settings._.cooldown).getTime())) / 1000 / 60), 'core.minutes')), opts.sender)
        return
      }

      // save new timestamp if not bypassed
      if (!(await this.settings.bypassCooldownByOwnerAndMods && (isMod || global.commons.isBroadcaster(opts.sender)))) this.settings._.cooldown = new Date()

      const isAlreadyChallenged = !_.isEmpty(await global.db.engine.findOne(this.collection.users, { key: '_users', user: opts.sender.username, challenging: username }))
      if (!isAlreadyChallenged) await global.db.engine.insert(this.collection.users, { key: '_users', user: opts.sender.username, challenging: username })
      let message = await global.commons.prepare('gambling.fightme.challenge', { username: username, sender: opts.sender.username }); debug(message)
      global.commons.sendMessage(message, opts.sender)
    }
  }
}

module.exports = new FightMe()
