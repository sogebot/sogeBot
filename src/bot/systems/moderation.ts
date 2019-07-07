// 3rdparty libraries
import * as _ from 'lodash';
import XRegExp from 'xregexp';

import constants from '../constants';
import { permission } from '../permissions';
import { command, default_permission, parser, settings } from '../decorators';
import Message from '../message';
import System from './_interface';
import { timeout, sendMessage, prepare, getLocalizedName, isModerator, isOwner } from '../commons';

class Moderation extends System {
  @settings('lists')
  cListsWhitelist: string[] = [];
  @settings('lists')
  cListsBlacklist: string[] = [];
  @settings('lists')
  cListsModerateSubscribers: boolean = true;
  @settings('lists')
  cListsTimeout: number = 120;

  @settings('links')
  cLinksEnabled: boolean = true;
  @settings('links')
  cLinksModerateSubscribers: boolean = true;
  @settings('links')
  cLinksIncludeSpaces: boolean = false;
  @settings('links')
  cLinksIncludeClips: boolean = true;
  @settings('links')
  cLinksTimeout: number = 120;

  @settings('symbols')
  cSymbolsEnabled: boolean = true;
  @settings('symbols')
  cSymbolsModerateSubscribers: boolean = true;
  @settings('symbols')
  cSymbolsTriggerLength: number = 15;
  @settings('symbols')
  cSymbolsMaxSymbolsConsecutively: number = 10;
  @settings('symbols')
  cSymbolsMaxSymbolsPercent: number = 50;
  @settings('symbols')
  cSymbolsTimeout: number = 120;

  @settings('longMessage')
  cLongMessageEnabled: boolean = true;
  @settings('longMessage')
  cLongMessageModerateSubscribers: boolean = true;
  @settings('longMessage')
  cLongMessageTriggerLength: number = 300;
  @settings('longMessage')
  cLongMessageTimeout: number = 120;

  @settings('caps')
  cCapsEnabled: boolean = true;
  @settings('caps')
  cCapsModerateSubscribers: boolean = true;
  @settings('caps')
  cCapsTriggerLength: number = 15;
  @settings('caps')
  cCapsMaxCapsPercent: number = 50;
  @settings('caps')
  cCapsTimeout: number = 120;

  @settings('spam')
  cSpamEnabled: boolean = true;
  @settings('spam')
  cSpamModerateSubscribers: boolean = true;
  @settings('spam')
  cSpamTriggerLength: number = 15;
  @settings('spam')
  cSpamMaxLength: number = 50;
  @settings('spam')
  cSpamTimeout: number = 300;

  @settings('color')
  cColorEnabled: boolean = true;
  @settings('color')
  cColorModerateSubscribers: boolean = true;
  @settings('color')
  cColorTimeout: number = 300;

  @settings('emotes')
  cEmotesEnabled: boolean = true;
  @settings('emotes')
  cEmotesModerateSubscribers: boolean = true;
  @settings('emotes')
  cEmotesMaxCount: number = 15;
  @settings('emotes')
  cEmotesTimeout: number = 120;

  @settings('warnings')
  cWarningsAllowedCount: number = 3;
  @settings('warnings')
  cWarningsAnnounceTimeouts: boolean = true;
  @settings('warnings')
  cWarningsShouldClearChat: boolean = true;

  constructor () {
    super();
    this.addMenu({ category: 'settings', name: 'systems', id: 'systems' });
  }

  sockets () {
    if (this.socket === null) {
      return setTimeout(() => this.sockets(), 100);
    }
    this.socket.on('connection', (socket) => {
      socket.on('lists.get', async (cb) => {
        cb(null, {
          blacklist: this.cListsBlacklist,
          whitelist: this.cListsWhitelist
        });
      });
      socket.on('lists.set', async (data) => {
        this.cListsBlacklist = data.blacklist.filter(entry => entry.trim() !== '');
        this.cListsWhitelist = data.whitelist.filter(entry => entry.trim() !== '');
      });
    });
  }

  async timeoutUser (sender, text, warning, msg, time, type) {
    let [warnings, silent] = await Promise.all([
      global.db.engine.find(global.systems.moderation.collection.warnings, { username: sender.username }),
      this.isSilent(type)
    ]);
    text = text.trim();

    // cleanup warnings
    let wasCleaned = false;
    for (let warning of _.filter(warnings, (o) => _.now() - o.timestamp > 1000 * 60 * 60)) {
      await global.db.engine.remove(global.systems.moderation.collection.warnings, { _id: warning._id.toString() });
      wasCleaned = true;
    }
    if (wasCleaned) {warnings = await global.db.engine.find(global.systems.moderation.collection.warnings, { username: sender.username });}

    if (this.cWarningsAllowedCount === 0) {
      msg = await new Message(msg.replace(/\$count/g, -1)).parse();
      global.log.timeout(`${sender.username} [${type}] ${time}s timeout | ${text}`);
      timeout(sender.username, msg, time);
      return;
    }

    const isWarningCountAboveThreshold = warnings.length >= this.cWarningsAllowedCount;
    if (isWarningCountAboveThreshold) {
      msg = await new Message(warning.replace(/\$count/g, this.cWarningsAllowedCount - warnings.length)).parse();
      global.log.timeout(`${sender.username} [${type}] ${time}s timeout | ${text}`);
      timeout(sender.username, msg, time);
      await global.db.engine.remove(global.systems.moderation.collection.warnings, { username: sender.username });
    } else {
      await global.db.engine.insert(global.systems.moderation.collection.warnings, { username: sender.username, timestamp: _.now() });
      const warningsLeft = this.cWarningsAllowedCount - warnings.length;
      warning = await new Message(warning.replace(/\$count/g, warningsLeft < 0 ? 0 : warningsLeft)).parse();
      if (this.cWarningsShouldClearChat) {
        global.log.timeout(`${sender.username} [${type}] 1s timeout, warnings left ${warningsLeft < 0 ? 0 : warningsLeft} | ${text}`);
        timeout(sender.username, warning, 1);
      }

      if (this.cWarningsAnnounceTimeouts && !silent) {
        global.tmi.delete('bot', sender.id);
        sendMessage('$sender, ' + warning, sender);
      }
    }
  }

  async whitelist (text) {
    let ytRegex, clipsRegex, spotifyRegex;

    // check if spotify -or- alias of spotify contain open.spotify.com link
    if (await global.integrations.spotify.isEnabled()) {
      // we can assume its first command in array (spotify have only one command)
      const command = (await global.integrations.spotify.commands())[0].command;
      const alias = await global.db.engine.findOne(global.systems.alias.collection.data, { command });
      if (!_.isEmpty(alias) && alias.enabled && await global.systems.alias.isEnabled()) {
        spotifyRegex = new RegExp('^(' + command + '|' + alias.alias + ') \\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
      } else {
        spotifyRegex = new RegExp('^(' + command + ') \\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
      }
      text = text.replace(spotifyRegex, '');
    }

    // check if songrequest -or- alias of songrequest contain youtube link
    if (await global.systems.songs.isEnabled()) {
      let alias = await global.db.engine.findOne(global.systems.alias.collection.data, { command: '!songrequest' });
      const cmd = global.systems.songs.getCommand('!songrequest');
      if (!_.isEmpty(alias) && alias.enabled && await global.systems.alias.isEnabled()) {
        ytRegex = new RegExp('^(' + cmd + '|' + alias.alias + ') \\S+(?:youtu.be\\/|v\\/|e\\/|u\\/\\w+\\/|embed\\/|v=)([^#&?]*).*', 'gi');
      } else {
        ytRegex =  new RegExp('^(' + cmd + ') \\S+(?:youtu.be\\/|v\\/|e\\/|u\\/\\w+\\/|embed\\/|v=)([^#&?]*).*', 'gi');
      }
      text = text.replace(ytRegex, '');
    }

    if (!this.cLinksIncludeClips) {
      clipsRegex = /.*(clips.twitch.tv\/)(\w+)/;
      text = text.replace(clipsRegex, '');
    }

    text = ` ${text} `;
    let whitelist = this.cListsWhitelist;

    for (let value of whitelist.map(o => o.trim().replace(/\*/g, '[\\pL0-9\\S]*').replace(/\+/g, '[\\pL0-9\\S]+'))) {
      if (value.length > 0) {
        let regexp;
        if (value.startsWith('domain:')) {
          regexp = XRegExp(` [\\S]*${XRegExp.escape(value.replace('domain:', ''))}[\\S]* `, 'gi');
        } else { // default regexp behavior
          regexp = XRegExp(` [^\\s\\pL0-9\\w]?${value}[^\\s\\pL0-9\\w]? `, 'gi');
        }
        // we need to change 'text' to ' text ' for regexp to correctly work
        text = XRegExp.replace(` ${text} `, regexp, '').trim();
      }
    }
    return text.trim();
  }

  @command('!permit')
  @default_permission(permission.CASTERS)
  async permitLink (opts) {
    try {
      var parsed = opts.parameters.match(/^@?([\S]+) ?(\d+)?$/);
      let count = 1;
      if (!_.isNil(parsed[2])) {count = parseInt(parsed[2], 10);}

      for (let i = 0; i < count; i++) {await global.db.engine.insert(this.collection.permits, { username: parsed[1].toLowerCase() });}

      let m = await prepare('moderation.user-have-link-permit', { username: parsed[1].toLowerCase(), link: getLocalizedName(count, 'core.links'), count: count });
      sendMessage(m, opts.sender, opts.attr);
    } catch (e) {
      sendMessage(global.translate('moderation.permit-parse-failed'), opts.sender, opts.attr);
    }
  }

  @parser({ priority: constants.MODERATION })
  async containsLink (opts) {
    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || !this.cLinksEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cLinksModerateSubscribers)) {
      return true;
    }

    const whitelisted = await this.whitelist(opts.message);
    const urlRegex = this.cLinksIncludeSpaces
      ? /(www)? ??\.? ?[a-zA-Z0-9]+([a-zA-Z0-9-]+) ??\. ?(aero|bet|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|shop|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|money|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig
      : /[a-zA-Z0-9]+([a-zA-Z0-9-]+)?\.(aero|bet|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|shop|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|money|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig;

    if (whitelisted.search(urlRegex) >= 0) {
      let permit = await global.db.engine.findOne(this.collection.permits, { username: opts.sender.username });
      if (!_.isEmpty(permit)) {
        await global.db.engine.remove(this.collection.permits, { _id: permit._id.toString() });
        return true;
      } else {
        this.timeoutUser(opts.sender, whitelisted,
          global.translate('moderation.user-is-warned-about-links'),
          global.translate('moderation.user-have-timeout-for-links'),
          this.cLinksTimeout, 'links');
        return false;
      }
    } else {
      return true;
    }
  }

  @parser({ priority: constants.MODERATION })
  async symbols (opts) {
    const whitelisted = await this.whitelist(opts.message);
    var msgLength = whitelisted.trim().length;
    var symbolsLength = 0;

    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || msgLength < this.cSymbolsTriggerLength || !this.cSymbolsEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cSymbolsEnabled)) {
      return true;
    }

    var out = whitelisted.match(/([^\s\u0500-\u052F\u0400-\u04FF\w]+)/g);
    for (var item in out) {
      if (out.hasOwnProperty(item)) {
        var symbols = out[item];
        if (symbols.length >= this.cSymbolsMaxSymbolsConsecutively) {
          this.timeoutUser(opts.sender, opts.message,
            global.translate('moderation.user-is-warned-about-symbols'),
            global.translate('moderation.user-have-timeout-for-symbols'),
            this.cSymbolsTimeout, 'symbols');
          return false;
        }
        symbolsLength = symbolsLength + symbols.length;
      }
    }
    if (Math.ceil(symbolsLength / (msgLength / 100)) >= this.cSymbolsMaxSymbolsPercent) {
      this.timeoutUser(opts.sender, opts.message, global.translate('moderation.warnings.symbols'), global.translate('moderation.symbols'), this.cSymbolsTimeout, 'symbols');
      return false;
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async longMessage (opts) {
    const whitelisted = await this.whitelist(opts.message);

    var msgLength = whitelisted.trim().length;
    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || msgLength < this.cLongMessageTriggerLength || !this.cLongMessageEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cLongMessageModerateSubscribers)) {
      return true;
    } else {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-long-message'),
        global.translate('moderation.user-have-timeout-for-long-message'),
        this.cLongMessageTimeout, 'longmessage');
      return false;
    }
  }

  @parser({ priority: constants.MODERATION })
  async caps (opts) {
    const whitelisted = await this.whitelist(opts.message);

    let emotesCharList: number[] = [];
    if (Symbol.iterator in Object(opts.sender.emotes)) {
      for (let emote of opts.sender.emotes) {
        for (let i of _.range(parseInt(emote.start, 10), parseInt(emote.end, 10) + 1)) {
          emotesCharList.push(i);
        }
      }
    }

    var msgLength = whitelisted.trim().length;
    var capsLength = 0;

    const regexp = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~]/gi;
    for (let i = 0; i < whitelisted.length; i++) {
      // if is emote or symbol - continue
      if (_.includes(emotesCharList, i) || !_.isNull(whitelisted.charAt(i).match(regexp))) {
        msgLength = parseInt(msgLength, 10) - 1;
        continue;
      } else if (!_.isFinite(parseInt(whitelisted.charAt(i), 10)) && whitelisted.charAt(i).toUpperCase() === whitelisted.charAt(i) && whitelisted.charAt(i) !== ' ') {
        capsLength += 1;
      }
    }

    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || msgLength < this.cCapsTriggerLength || !this.cCapsEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cCapsModerateSubscribers)) {
      return true;
    }
    if (Math.ceil(capsLength / (msgLength / 100)) >= this.cCapsMaxCapsPercent) {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-caps'),
        global.translate('moderation.user-have-timeout-for-caps'),
        this.cCapsTimeout, 'caps');
      return false;
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async spam (opts) {
    const whitelisted = await this.whitelist(opts.message);

    var msgLength = whitelisted.trim().length;

    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || msgLength < this.cSpamTriggerLength || !this.cSpamEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cSpamModerateSubscribers)) {
      return true;
    }
    var out = whitelisted.match(/(.+)(\1+)/g);
    for (var item in out) {
      if (out.hasOwnProperty(item) && out[item].length >= this.cSpamMaxLength) {
        this.timeoutUser(opts.sender, opts.message,
          global.translate('moderation.user-have-timeout-for-spam'),
          global.translate('moderation.user-is-warned-about-spam'),
          this.cSpamTimeout, 'spam');
        return false;
      }
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async color (opts) {
    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || !this.cColorEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cColorModerateSubscribers)) {
      return true;
    }

    if (opts.sender['message-type'] === 'action') {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-color'),
        global.translate('moderation.user-have-timeout-for-color'),
        this.cColorTimeout, 'color');
      return false;
    } else {return true;}
  }

  @parser({ priority: constants.MODERATION })
  async emotes (opts) {
    if (!(Symbol.iterator in Object(opts.sender.emotes))) {return true;}

    var count = opts.sender.emotes.length;
    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || !this.cEmotesEnabled || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cEmotesModerateSubscribers)) {
      return true;
    }

    if (count > this.cEmotesMaxCount) {
      this.timeoutUser(opts.sender, opts.message,
        global.translate('moderation.user-is-warned-about-emotes'),
        global.translate('moderation.user-have-timeout-for-emotes'),
        this.cEmotesTimeout, 'emotes');
      return false;
    } else {return true;}
  }

  @parser({ priority: constants.MODERATION })
  async blacklist (opts) {
    if (isOwner(opts.sender) || (await isModerator(opts.sender)) || (typeof opts.sender.badges.subscriber !== 'undefined' && !this.cListsModerateSubscribers)) {
      return true;
    }

    let isOK = true;
    for (let value of this.cListsBlacklist.map(o => o.trim().replace(/\*/g, '[\\pL0-9]*').replace(/\+/g, '[\\pL0-9]+'))) {
      if (value.length > 0) {
        const regexp = XRegExp(` [^\\s\\pL0-9\\w]?${value}[^\\s\\pL0-9\\w]? `, 'gi');
        // we need to change 'text' to ' text ' for regexp to correctly work
        if (XRegExp.exec(` ${opts.message} `, regexp)) {
          isOK = false;
          this.timeoutUser(opts.sender, opts.message,
            global.translate('moderation.user-is-warned-about-blacklist'),
            global.translate('moderation.user-have-timeout-for-blacklist'),
            this.cListsTimeout, 'blacklist');
          break;
        }
      }
    }
    return isOK;
  }

  async isSilent (name) {
    let item = await global.db.engine.findOne(this.collection.messagecooldown, { key: name });
    if (_.isEmpty(item) || (_.now() - item.value) >= 60000) {
      await global.db.engine.update(this.collection.messagecooldown, { key: name }, { value: _.now() });
      return false;
    }
    return true;
  }
}

export default Moderation;
export { Moderation };
