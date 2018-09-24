'use strict'

// 3rdparty libraries
const _ = require('lodash')
const XRegExp = require('xregexp')
// bot libraries
var constants = require('../constants')
const Message = require('../message')
const System = require('./_interface')
var log = global.log

class Moderation extends System {
  constructor () {
    const settings = {
      lists: {
        whitelist: [],
        blacklist: [],
        moderateSubscribers: true,
        timeout: 120
      },
      links: {
        enabled: true,
        moderateSubscribers: true,
        includeSpaces: false,
        includeClips: true,
        timeout: 120
      },
      symbols: {
        enabled: true,
        moderateSubscribers: true,
        triggerLength: 15,
        maxSymbolsConsecutively: 10,
        maxSymbolsPercent: 50,
        timeout: 120
      },
      longMessage: {
        enabled: true,
        moderateSubscribers: true,
        triggerLength: 300,
        timeout: 120
      },
      caps: {
        enabled: true,
        moderateSubscribers: true,
        triggerLength: 15,
        maxCapsPercent: 50,
        timeout: 120
      },
      spam: {
        enabled: true,
        moderateSubscribers: true,
        triggerLength: 15,
        maxLength: 50,
        timeout: 300
      },
      color: {
        enabled: true,
        moderateSubscribers: true,
        timeout: 120
      },
      emotes: {
        enabled: true,
        moderateSubscribers: true,
        maxCount: 15,
        timeout: 120
      },
      warnings: {
        warningCount: 3,
        announce: true,
        shouldClearChat: true
      },
      commands: [
        { name: '!permit', fnc: 'permitLink', permission: constants.OWNER_ONLY }
      ],
      parsers: [
        { name: 'containsLink', priority: constants.MODERATION },
        { name: 'symbols', priority: constants.MODERATION },
        { name: 'longMessage', priority: constants.MODERATION },
        { name: 'caps', priority: constants.MODERATION },
        { name: 'spam', priority: constants.MODERATION },
        { name: 'color', priority: constants.MODERATION },
        { name: 'emotes', priority: constants.MODERATION },
        { name: 'blacklist', priority: constants.MODERATION }
      ]
    }

    super({ settings })
    this.addMenu({ category: 'settings', name: 'systems', id: 'systems' })
  }

  sockets () {
    this.socket.on('connection', (socket) => {
      socket.on('lists.get', async (cb) => {
        cb(null, {
          blacklist: await this.settings.lists.blacklist,
          whitelist: await this.settings.lists.whitelist
        })
      })
      socket.on('lists.set', async (data) => {
        this.settings.lists.blacklist = data.blacklist.filter(entry => entry.trim() !== '')
        this.settings.lists.whitelist = data.whitelist.filter(entry => entry.trim() !== '')
      })
    })
  }

  async timeoutUser (sender, text, warning, msg, time, type) {
    let [warningsAllowed, warningsTimeout, announceTimeouts, warnings, silent] = await Promise.all([
      this.settings.warnings.warningCount,
      this.settings.warnings.shouldClearChat,
      this.settings.warnings.announce,
      global.db.engine.find(global.systems.moderation.collection.warnings, { username: sender.username }),
      this.isSilent(type)
    ])
    text = text.trim()

    // cleanup warnings
    let wasCleaned = false
    for (let warning of _.filter(warnings, (o) => _.now() - o.timestamp > 1000 * 60 * 60)) {
      await global.db.engine.remove(global.systems.moderation.collection.warnings, { _id: warning._id.toString() })
      wasCleaned = true
    }
    if (wasCleaned) warnings = await global.db.engine.find(global.systems.moderation.collection.warnings, { username: sender.username })

    if (warningsAllowed === 0) {
      msg = await new Message(msg.replace(/\$count/g, -1)).parse()
      log.timeout(`${sender.username} [${type}] ${time}s timeout | ${text}`)
      global.commons.timeout(sender.username, msg, time)
      return
    }

    const isWarningCountAboveThreshold = warnings.length >= parseInt(warningsAllowed, 10)
    if (isWarningCountAboveThreshold) {
      msg = await new Message(warning.replace(/\$count/g, parseInt(warningsAllowed, 10) - warnings.length)).parse()
      log.timeout(`${sender.username} [${type}] ${time}s timeout | ${text}`)
      global.commons.timeout(sender.username, msg, time)
      await global.db.engine.remove(global.systems.moderation.collection.warnings, { username: sender.username })
    } else {
      await global.db.engine.insert(global.systems.moderation.collection.warnings, { username: sender.username, timestamp: _.now() })
      const warningsLeft = parseInt(warningsAllowed, 10) - warnings.length
      warning = await new Message(warning.replace(/\$count/g, warningsLeft < 0 ? 0 : warningsLeft)).parse()
      if (warningsTimeout) {
        log.timeout(`${sender.username} [${type}] 1s timeout, warnings left ${warningsLeft < 0 ? 0 : warningsLeft} | ${text}`)
        global.commons.timeout(sender.username, warning, 1)
      }

      if (announceTimeouts && !silent) {
        global.commons.sendMessage('$sender, ' + warning, sender)
      }
    }
  }

  async whitelist (text) {
    let ytRegex, clipsRegex

    // check if songrequest -or- alias of songrequest contain youtube link -> change it to ID
    if (await global.systems.songs.isEnabled()) {
      let alias = await global.db.engine.findOne(global.systems.alias.collection.data, { command: '!songrequest' })
      if (!_.isEmpty(alias) && alias.enabled && await global.systems.alias.isEnabled()) {
        ytRegex = new RegExp('^(!songrequest|' + alias.alias + ') \\S+(?:youtu.be\\/|v\\/|e\\/|u\\/\\w+\\/|embed\\/|v=)([^#&?]*).*', 'gi')
      } else {
        ytRegex = /^(!songrequest) \S+(?:youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/gi
      }
      text = text.replace(ytRegex, '')
    }

    const includeClips = await this.settings.links.includeClips

    if (!includeClips) {
      clipsRegex = /.*(clips.twitch.tv\/)(\w+)/
      text = text.replace(clipsRegex, '')
    }

    text = ` ${text} `
    let whitelist = await this.settings.lists.whitelist
    for (let value of whitelist) {
      value = value.trim().replace(/\*/g, '[\\pL0-9]*').replace(/\+/g, '[\\pL0-9]+')
      const regexp = XRegExp(` [^\\s\\pL0-9\\w]?${value}[^\\s\\pL0-9\\w]? `, 'gi')
      // we need to change 'text' to ' text ' for regexp to correctly work
      text = XRegExp.replace(` ${text} `, regexp, '').trim()
    }
    return text
  }

  async permitLink (opts) {
    try {
      var parsed = opts.parameters.match(/^@?([\S]+) ?(\d+)?$/)
      let count = 1
      if (!_.isNil(parsed[2])) count = parseInt(parsed[2], 10)

      for (let i = 0; i < count; i++) await global.db.engine.insert(this.collection.permits, { username: parsed[1].toLowerCase() })

      let m = await global.commons.prepare('moderation.user-have-link-permit', { username: parsed[1].toLowerCase(), link: global.commons.getLocalizedName(count, 'core.links'), count: count })
      global.commons.sendMessage(m, opts.sender)
    } catch (e) {
      global.commons.sendMessage(global.translate('moderation.permit-parse-failed'), opts.sender)
    }
  }

  async containsLink (opts) {
    let [isEnabled, isEnabledForSubs, isEnabledForSpaces, timeout, isOwner, isMod, whitelisted] = await Promise.all([
      this.settings.links.enabled,
      this.settings.links.moderateSubscribers,
      this.settings.links.includeSpaces,
      this.settings.links.timeout,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.whitelist(opts.message)
    ])

    if (isOwner || isMod || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }

    const urlRegex = isEnabledForSpaces
      ? /(www)? ??\.? ?[a-zA-Z0-9]+([a-zA-Z0-9-]+) ??\. ?(aero|bet|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|money|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig
      : /[a-zA-Z0-9]+([a-zA-Z0-9-]+)?\.(aero|bet|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|money|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig
    if (whitelisted.search(urlRegex) >= 0) {
      let permit = await global.db.engine.findOne(this.collection.permits, { username: opts.sender.username })
      if (!_.isEmpty(permit)) {
        await global.db.engine.remove(this.collection.permits, { _id: permit._id.toString() })
        return true
      } else {
        this.timeoutUser(opts.sender, whitelisted,
          global.translate('moderation.user-is-warned-about-links'),
          global.translate('moderation.user-have-timeout-for-links'),
          timeout, 'links')
        return false
      }
    } else {
      return true
    }
  }

  async symbols (opts) {
    let [isEnabled, isEnabledForSubs, whitelisted, isOwner, isMod, timeout, triggerLength, maxSymbolsConsecutively, maxSymbolsPercent] = await Promise.all([
      this.settings.symbols.enabled,
      this.settings.symbols.moderateSubscribers,
      this.whitelist(opts.message),
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.settings.symbols.timeout,
      this.settings.symbols.triggerLength,
      this.settings.symbols.maxSymbolsConsecutively,
      this.settings.symbols.maxSymbolsPercent
    ])

    var msgLength = whitelisted.trim().length
    var symbolsLength = 0

    if (isOwner || isMod || msgLength < triggerLength || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }

    var out = whitelisted.match(/([^\s\u0500-\u052F\u0400-\u04FF\w]+)/g)
    for (var item in out) {
      if (out.hasOwnProperty(item)) {
        var symbols = out[item]
        if (symbols.length >= maxSymbolsConsecutively) {
          this.timeoutUser(opts.sender, opts.message,
            global.translate('moderation.user-is-warned-about-symbols'),
            global.translate('moderation.user-have-timeout-for-symbols'),
            timeout, 'symbols')
          return false
        }
        symbolsLength = symbolsLength + symbols.length
      }
    }
    if (Math.ceil(symbolsLength / (msgLength / 100)) >= maxSymbolsPercent) {
      this.timeoutUser(opts.sender, opts.message, global.translate('moderation.warnings.symbols'), global.translate('moderation.symbols'), timeout, 'symbols')
      return false
    }
    return true
  }

  async longMessage (opts) {
    let [isEnabled, isEnabledForSubs, isOwner, isMod, whitelisted, timeout, triggerLength] = await Promise.all([
      this.settings.longMessage.enabled,
      this.settings.longMessage.moderateSubscribers,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.whitelist(opts.message),
      this.settings.longMessage.timeout,
      this.settings.longMessage.triggerLength
    ])

    var msgLength = whitelisted.trim().length
    if (isOwner || isMod || msgLength < triggerLength || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    } else {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-long-message'),
        global.translate('moderation.user-have-timeout-for-long-message'),
        timeout, 'longmessage')
      return false
    }
  }

  async caps (opts) {
    let [isEnabled, isEnabledForSubs, isOwner, isMod, whitelisted, timeout, triggerLength, maxCapsPercent] = await Promise.all([
      this.settings.caps.enabled,
      this.settings.caps.moderateSubscribers,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.whitelist(opts.message),
      this.settings.caps.timeout,
      this.settings.caps.triggerLength,
      this.settings.caps.maxCapsPercent
    ])

    let emotesCharList = []
    for (let emote of opts.sender.emotes) {
      for (let i of _.range(parseInt(emote.start, 10), parseInt(emote.end, 10) + 1)) {
        emotesCharList.push(i)
      }
    }

    var msgLength = whitelisted.trim().length
    var capsLength = 0

    const regexp = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]/gi
    whitelisted = whitelisted.trim()
    for (let i = 0; i < whitelisted.length; i++) {
      // if is emote or symbol - continue
      if (_.includes(emotesCharList, i) || !_.isNull(whitelisted.charAt(i).match(regexp))) {
        msgLength = parseInt(msgLength, 10) - 1
        continue
      } else if (!_.isFinite(parseInt(whitelisted.charAt(i), 10)) && whitelisted.charAt(i).toUpperCase() === whitelisted.charAt(i) && whitelisted.charAt(i) !== ' ') {
        capsLength += 1
      }
    }

    if (isOwner || isMod || msgLength < triggerLength || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }
    if (Math.ceil(capsLength / (msgLength / 100)) >= maxCapsPercent) {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-caps'),
        global.translate('moderation.user-have-timeout-for-caps'),
        timeout, 'caps')
      return false
    }
    return true
  }

  async spam (opts) {
    let [isEnabled, isEnabledForSubs, isOwner, isMod, whitelisted, timeout, triggerLength, maxLength] = await Promise.all([
      this.settings.spam.enabled,
      this.settings.spam.moderateSubscribers,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.whitelist(opts.message),
      this.settings.spam.timeout,
      this.settings.spam.triggerLength,
      this.settings.spam.maxLength
    ])

    var msgLength = whitelisted.trim().length

    if (isOwner || isMod || msgLength < triggerLength || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }
    var out = whitelisted.match(/(.+)(\1+)/g)
    for (var item in out) {
      if (out.hasOwnProperty(item) && out[item].length >= maxLength) {
        this.timeoutUser(opts.sender, opts.message,
          global.translate('moderation.user-have-timeout-for-spam'),
          global.translate('moderation.user-is-warned-about-spam'),
          timeout, 'spam')
        return false
      }
    }
    return true
  }

  async color (opts) {
    let [isEnabled, isEnabledForSubs, isOwner, isMod, timeout] = await Promise.all([
      this.settings.color.enabled,
      this.settings.color.moderateSubscribers,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.settings.color.timeout
    ])

    if (isOwner || isMod || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }

    if (opts.sender['message-type'] === 'action') {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-color'),
        global.translate('moderation.user-have-timeout-for-color'),
        timeout, 'color')
      return false
    } else return true
  }

  async emotes (opts) {
    let [isEnabled, isEnabledForSubs, isOwner, isMod, timeout, maxCount] = await Promise.all([
      this.settings.emotes.enabled,
      this.settings.emotes.moderateSubscribers,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.settings.emotes.timeout,
      this.settings.emotes.maxCount
    ])

    var count = opts.sender.emotes.length
    if (isOwner || isMod || !isEnabled || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }

    if (count > maxCount) {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-emotes'),
        global.translate('moderation.user-have-timeout-for-emotes'),
        timeout, 'emotes')
      return false
    } else return true
  }

  async blacklist (opts) {
    let [isEnabledForSubs, isOwner, isMod, timeout, blacklist] = await Promise.all([
      this.settings.lists.moderateSubscribers,
      global.commons.isOwner(opts.sender),
      global.commons.isMod(opts.sender),
      this.settings.lists.timeout,
      this.settings.lists.blacklist
    ])
    if (isOwner || isMod || (opts.sender.isSubscriber && !isEnabledForSubs)) {
      return true
    }

    let isOK = true
    for (let value of blacklist) {
      value = value.trim().replace(/\*/g, '[\\pL0-9]*').replace(/\+/g, '[\\pL0-9]+')
      const regexp = XRegExp(` [^\\s\\pL0-9\\w]?${value}[^\\s\\pL0-9\\w]? `, 'gi')
      // we need to change 'text' to ' text ' for regexp to correctly work
      if (XRegExp.exec(` ${opts.message} `, regexp) && value.length > 0) {
        isOK = false
        this.timeoutUser(opts.sender, opts.message,
          global.translate('moderation.user-is-warned-about-blacklist'),
          global.translate('moderation.user-have-timeout-for-blacklist'),
          timeout, 'blacklist')
        break
      }
    }
    return isOK
  }

  async isSilent (name) {
    let item = await global.db.engine.findOne(this.collection.messagecooldown, { key: name })
    if (_.isEmpty(item) || (_.now() - item.value) >= 60000) {
      await global.db.engine.update(this.collection.messagecooldown, { key: name }, { value: _.now() })
      return false
    }
    return true
  }
}

module.exports = new Moderation()
