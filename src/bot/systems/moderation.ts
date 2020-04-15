// 3rdparty libraries
import * as _ from 'lodash';
import XRegExp from 'xregexp';
import emojiRegex from 'emoji-regex';

import * as constants from '../constants';
import { permission } from '../helpers/permissions';
import { command, default_permission, parser, permission_settings, settings } from '../decorators';
import Message from '../message';
import System from './_interface';
import { getLocalizedName, prepare, sendMessage, timeout } from '../commons';
import { timeout as timeoutLog } from '../helpers/log';
import { clusteredClientDelete } from '../cluster';
import { adminEndpoint } from '../helpers/socket';
import { Alias } from '../database/entity/alias';

import { getRepository, LessThan } from 'typeorm';
import { ModerationMessageCooldown, ModerationPermit, ModerationWarning } from '../database/entity/moderation';
import permissions from '../permissions';
import { translate } from '../translate';
import spotify from '../integrations/spotify';
import songs from './songs';
import aliasSystem from './alias';
import users from '../users';

class Moderation extends System {
  @settings('lists')
  cListsWhitelist: string[] = [];
  @settings('lists')
  cListsBlacklist: string[] = [];
  @permission_settings('lists')
  cListsEnabled = true;
  @permission_settings('lists')
  cListsTimeout = 120;

  @permission_settings('links')
  cLinksEnabled = true;
  @permission_settings('links')
  cLinksIncludeSpaces = false;
  @permission_settings('links')
  cLinksIncludeClips = true;
  @permission_settings('links')
  cLinksTimeout = 120;

  @permission_settings('symbols')
  cSymbolsEnabled = true;
  @permission_settings('symbols')
  cSymbolsTriggerLength = 15;
  @permission_settings('symbols')
  cSymbolsMaxSymbolsConsecutively = 10;
  @permission_settings('symbols')
  cSymbolsMaxSymbolsPercent = 50;
  @permission_settings('symbols')
  cSymbolsTimeout = 120;

  @permission_settings('longMessage')
  cLongMessageEnabled = true;
  @permission_settings('longMessage')
  cLongMessageTriggerLength = 300;
  @permission_settings('longMessage')
  cLongMessageTimeout = 120;

  @permission_settings('caps')
  cCapsEnabled = true;
  @permission_settings('caps')
  cCapsTriggerLength = 15;
  @permission_settings('caps')
  cCapsMaxCapsPercent = 50;
  @permission_settings('caps')
  cCapsTimeout = 120;

  @permission_settings('spam')
  cSpamEnabled = true;
  @permission_settings('spam')
  cSpamTriggerLength = 15;
  @permission_settings('spam')
  cSpamMaxLength = 50;
  @permission_settings('spam')
  cSpamTimeout = 300;

  @permission_settings('color')
  cColorEnabled = true;
  @permission_settings('color')
  cColorTimeout = 300;

  @permission_settings('emotes')
  cEmotesEnabled = true;
  @permission_settings('emotes')
  cEmotesEmojisAreEmotes = true;
  @permission_settings('emotes')
  cEmotesMaxCount = 15;
  @permission_settings('emotes')
  cEmotesTimeout = 120;

  @settings('warnings')
  cWarningsAllowedCount = 3;
  @settings('warnings')
  cWarningsAnnounceTimeouts = true;
  @settings('warnings')
  cWarningsShouldClearChat = true;

  sockets () {
    adminEndpoint(this.nsp, 'lists.get', async (cb) => {
      cb(null, {
        blacklist: this.cListsBlacklist,
        whitelist: this.cListsWhitelist,
      });
    });
    adminEndpoint(this.nsp, 'lists.set', async (data) => {
      this.cListsBlacklist = data.blacklist.filter(entry => entry.trim() !== '');
      this.cListsWhitelist = data.whitelist.filter(entry => entry.trim() !== '');
    });
  }

  async timeoutUser (sender, text, warning, msg, time, type) {
    // cleanup warnings
    await getRepository(ModerationWarning).delete({
      timestamp: LessThan(1000 * 60 * 60),
    });
    const warnings = await getRepository(ModerationWarning).find({ userId: Number(sender.userId) });
    const silent = await this.isSilent(type);

    text = text.trim();

    if (this.cWarningsAllowedCount === 0) {
      msg = await new Message(msg.replace(/\$count/g, -1)).parse();
      timeoutLog(`${sender.username} [${type}] ${time}s timeout | ${text}`);
      timeout(sender.username, msg, time);
      return;
    }

    const isWarningCountAboveThreshold = warnings.length >= this.cWarningsAllowedCount;
    if (isWarningCountAboveThreshold) {
      msg = await new Message(warning.replace(/\$count/g, this.cWarningsAllowedCount - warnings.length)).parse();
      timeoutLog(`${sender.username} [${type}] ${time}s timeout | ${text}`);
      timeout(sender.username, msg, time);
      await getRepository(ModerationWarning).delete({ userId: Number(sender.userId) });
    } else {
      await getRepository(ModerationWarning).insert({ userId: Number(sender.userId), timestamp: Date.now() });
      const warningsLeft = this.cWarningsAllowedCount - warnings.length;
      warning = await new Message(warning.replace(/\$count/g, warningsLeft < 0 ? 0 : warningsLeft)).parse();
      if (this.cWarningsShouldClearChat) {
        timeoutLog(`${sender.username} [${type}] 1s timeout, warnings left ${warningsLeft < 0 ? 0 : warningsLeft} | ${text}`);
        timeout(sender.username, warning, 1);
      }

      if (this.cWarningsAnnounceTimeouts && !silent) {
        clusteredClientDelete(sender.id);
        sendMessage('$sender, ' + warning, sender);
      }
    }
  }

  async whitelist (text, permId: string | null) {
    let ytRegex, clipsRegex, spotifyRegex;

    // check if spotify -or- alias of spotify contain open.spotify.com link
    if (spotify.enabled) {
      // we can assume its first command in array (spotify have only one command)
      const cmd = (await spotify.commands())[0].command;
      const alias = await getRepository(Alias).findOne({ where: { command: cmd } });
      if (alias && alias.enabled && aliasSystem.enabled) {
        spotifyRegex = new RegExp('^(' + cmd + '|' + alias.alias + ') \\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
      } else {
        spotifyRegex = new RegExp('^(' + cmd + ') \\S+open\\.spotify\\.com\\/track\\/(\\w+)(.*)?', 'gi');
      }
      text = text.replace(spotifyRegex, '');
    }

    // check if songrequest -or- alias of songrequest contain youtube link
    if (songs.enabled) {
      const alias = await getRepository(Alias).findOne({ where: { command: '!songrequest' } });
      const cmd = songs.getCommand('!songrequest');
      if (alias && alias.enabled && aliasSystem.enabled) {
        ytRegex = new RegExp('^(' + cmd + '|' + alias.alias + ') \\S+(?:youtu.be\\/|v\\/|e\\/|u\\/\\w+\\/|embed\\/|v=)([^#&?]*).*', 'gi');
      } else {
        ytRegex =  new RegExp('^(' + cmd + ') \\S+(?:youtu.be\\/|v\\/|e\\/|u\\/\\w+\\/|embed\\/|v=)([^#&?]*).*', 'gi');
      }
      text = text.replace(ytRegex, '');
    }

    if (permId) {
      const cLinksIncludeClips = (await this.getPermissionBasedSettingsValue('cLinksIncludeClips'))[permId];
      if (!cLinksIncludeClips) {
        clipsRegex = /.*(clips.twitch.tv\/)(\w+)/;
        text = text.replace(clipsRegex, '');
      }
    }

    text = ` ${text} `;
    const whitelist = this.cListsWhitelist;

    for (const value of whitelist.map(o => o.trim().replace(/\*/g, '[\\pL0-9\\S]*').replace(/\+/g, '[\\pL0-9\\S]+'))) {
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
      const parsed = opts.parameters.match(/^@?([\S]+) ?(\d+)?$/);
      let count = 1;
      if (!_.isNil(parsed[2])) {
        count = parseInt(parsed[2], 10);
      }

      const userId = await users.getIdByName(parsed[1].toLowerCase());
      for (let i = 0; i < count; i++) {
        await getRepository(ModerationPermit).insert({ userId });
      }

      const m = prepare('moderation.user-have-link-permit', { username: parsed[1].toLowerCase(), link: getLocalizedName(count, 'core.links'), count: count });
      sendMessage(m, opts.sender, opts.attr);
    } catch (e) {
      sendMessage(translate('moderation.permit-parse-failed'), opts.sender, opts.attr);
    }
  }

  @parser({ priority: constants.MODERATION })
  async containsLink (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cLinksEnabled');
    const cLinksIncludeSpaces = await this.getPermissionBasedSettingsValue('cLinksIncludeSpaces');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cLinksTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }

    const whitelisted = await this.whitelist(opts.message, permId);
    const urlRegex = cLinksIncludeSpaces[permId]
      ? /(www)? ??\.? ?[a-zA-Z0-9]+([a-zA-Z0-9-]+) ??\. ?(aero|bet|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|shop|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|money|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig
      : /[a-zA-Z0-9]+([a-zA-Z0-9-]+)?\.(aero|bet|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|shop|ac|ad|ae|af|ag|ai|al|am|an|ao|aq|ar|as|at|au|aw|az|ba|bb|bd|be|bf|bg|bh|bi|bj|bm|bn|bo|br|bs|bt|bv|bw|by|bz|ca|cc|cd|cf|cg|ch|ci|ck|cl|cm|cn|co|cr|cs|cu|cv|cx|cy|cz|de|dj|dk|dm|do|dz|ec|ee|eg|eh|er|es|et|fi|fj|fk|fm|fo|fr|ga|gb|gd|ge|gf|gg|gh|gi|gl|gm|gn|gp|gq|gr|gs|gt|gu|gw|gy|hk|hm|hn|hr|ht|hu|id|ie|il|im|in|io|iq|ir|is|it|je|jm|jo|jp|ke|kg|kh|ki|km|kn|kp|kr|kw|ky|kz|la|lb|lc|li|lk|lr|ls|lt|lu|lv|ly|ma|mc|md|me|mg|mh|mk|ml|mm|mn|mo|money|mp|mq|mr|ms|mt|mu|mv|mw|mx|my|mz|na|nc|ne|nf|ng|ni|nl|no|np|nr|nu|nz|om|pa|pe|pf|pg|ph|pk|pl|pm|pn|pr|ps|pt|pw|py|qa|re|ro|ru|rw|sa|sb|sc|sd|se|sg|sh|si|sj|sk|sl|sm|sn|so|sr|st|su|sv|sy|sz|tc|td|tf|tg|th|tj|tk|tm|tn|to|tp|tr|tt|tv|tw|tz|ua|ug|uk|um|us|uy|uz|va|vc|ve|vg|vi|vn|vu|wf|ws|ye|yt|yu|za|zm|zr|zw)\b/ig;

    if (whitelisted.search(urlRegex) >= 0) {
      const permit = await getRepository(ModerationPermit).findOne({ userId: Number(opts.sender.userId) });
      if (permit) {
        await getRepository(ModerationPermit).remove(permit);
        return true;
      } else {
        this.timeoutUser(opts.sender, whitelisted,
          translate('moderation.user-is-warned-about-links'),
          translate('moderation.user-have-timeout-for-links'),
          timeoutValues[permId], 'links');
        return false;
      }
    } else {
      return true;
    }
  }

  @parser({ priority: constants.MODERATION })
  async symbols (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cSymbolsEnabled');
    const cSymbolsTriggerLength = await this.getPermissionBasedSettingsValue('cSymbolsTriggerLength');
    const cSymbolsMaxSymbolsConsecutively = await this.getPermissionBasedSettingsValue('cSymbolsMaxSymbolsConsecutively');
    const cSymbolsMaxSymbolsPercent = await this.getPermissionBasedSettingsValue('cSymbolsMaxSymbolsPercent');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cSymbolsTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }

    const whitelisted = await this.whitelist(opts.message, permId);
    const msgLength = whitelisted.trim().length;
    let symbolsLength = 0;

    if (msgLength < cSymbolsTriggerLength[permId]) {
      return true;
    }

    const out = whitelisted.match(/([^\s\u0500-\u052F\u0400-\u04FF\w]+)/g);
    for (const item in out) {
      if (out.hasOwnProperty(item)) {
        const symbols = out[item];
        if (symbols.length >= cSymbolsMaxSymbolsConsecutively[permId]) {
          this.timeoutUser(opts.sender, opts.message,
            translate('moderation.user-is-warned-about-symbols'),
            translate('moderation.user-have-timeout-for-symbols'),
            timeoutValues[permId], 'symbols');
          return false;
        }
        symbolsLength = symbolsLength + symbols.length;
      }
    }
    if (Math.ceil(symbolsLength / (msgLength / 100)) >= cSymbolsMaxSymbolsPercent[permId]) {
      this.timeoutUser(opts.sender, opts.message, translate('moderation.user-is-warned-about-symbols'), translate('moderation.symbols'), timeoutValues[permId], 'symbols');
      return false;
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async longMessage (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cLongMessageEnabled');
    const cLongMessageTriggerLength = await this.getPermissionBasedSettingsValue('cLongMessageTriggerLength');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cLongMessageTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }

    const whitelisted = await this.whitelist(opts.message, permId);

    const msgLength = whitelisted.trim().length;
    if (msgLength < cLongMessageTriggerLength[permId]) {
      return true;
    } else {
      this.timeoutUser(opts.sender, opts.message,
        translate('moderation.user-is-warned-about-long-message'),
        translate('moderation.user-have-timeout-for-long-message'),
        timeoutValues[permId], 'longmessage');
      return false;
    }
  }

  @parser({ priority: constants.MODERATION })
  async caps (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cCapsEnabled');
    const cCapsTriggerLength = await this.getPermissionBasedSettingsValue('cCapsTriggerLength');
    const cCapsMaxCapsPercent = await this.getPermissionBasedSettingsValue('cCapsMaxCapsPercent');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cCapsTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }
    let whitelisted = await this.whitelist(opts.message, permId);

    const emotesCharList: number[] = [];
    if (Symbol.iterator in Object(opts.sender.emotes)) {
      for (const emote of opts.sender.emotes) {
        for (const i of _.range(emote.start, emote.end + 1)) {
          emotesCharList.push(i);
        }
      }
    }

    let msgLength = whitelisted.trim().length;
    let capsLength = 0;

    // exclude emotes from caps check
    whitelisted = whitelisted.replace(emojiRegex(), '').trim();

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

    if (msgLength < cCapsTriggerLength[permId]) {
      return true;
    }
    if (Math.ceil(capsLength / (msgLength / 100)) >= cCapsMaxCapsPercent[permId]) {
      this.timeoutUser(opts.sender, opts.message,
        translate('moderation.user-is-warned-about-caps'),
        translate('moderation.user-have-timeout-for-caps'),
        timeoutValues[permId], 'caps');
      return false;
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async spam (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cSpamEnabled');
    const cSpamTriggerLength = await this.getPermissionBasedSettingsValue('cSpamTriggerLength');
    const cSpamMaxLength = await this.getPermissionBasedSettingsValue('cSpamMaxLength');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cSpamTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }
    const whitelisted = await this.whitelist(opts.message,permId);

    const msgLength = whitelisted.trim().length;

    if (msgLength < cSpamTriggerLength[permId]) {
      return true;
    }
    const out = whitelisted.match(/(.+)(\1+)/g);
    for (const item in out) {
      if (out.hasOwnProperty(item) && out[item].length >= cSpamMaxLength[permId]) {
        this.timeoutUser(opts.sender, opts.message,
          translate('moderation.user-have-timeout-for-spam'),
          translate('moderation.user-is-warned-about-spam'),
          timeoutValues[permId], 'spam');
        return false;
      }
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async color (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cColorEnabled');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cColorTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }

    if (opts.sender['message-type'] === 'action') {
      this.timeoutUser(opts.sender, opts.message,
        translate('moderation.user-is-warned-about-color'),
        translate('moderation.user-have-timeout-for-color'),
        timeoutValues[permId], 'color');
      return false;
    } else {
      return true;
    }
  }

  @parser({ priority: constants.MODERATION })
  async emotes (opts: ParserOptions) {
    if (!(Symbol.iterator in Object(opts.sender.emotes))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cEmotesEnabled');
    const cEmotesEmojisAreEmotes = await this.getPermissionBasedSettingsValue('cEmotesEmojisAreEmotes');
    const cEmotesMaxCount = await this.getPermissionBasedSettingsValue('cEmotesMaxCount');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cEmotesTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }

    let count = opts.sender.emotes.length;
    if (cEmotesEmojisAreEmotes[permId]) {
      const regex = emojiRegex();
      while (regex.exec(opts.message)) {
        count++;
      }
    }

    if (count > cEmotesMaxCount[permId]) {
      this.timeoutUser(opts.sender, opts.message,
        translate('moderation.user-is-warned-about-emotes'),
        translate('moderation.user-have-timeout-for-emotes'),
        timeoutValues[permId], 'emotes');
      return false;
    } else {
      return true;
    }
  }

  @parser({ priority: constants.MODERATION })
  async blacklist (opts: ParserOptions) {
    const enabled = await this.getPermissionBasedSettingsValue('cListsEnabled');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cListsTimeout');
    const permId = await permissions.getUserHighestPermission(opts.sender.userId);

    if (permId === null || !enabled[permId]) {
      return true;
    }

    let isOK = true;
    for (const value of this.cListsBlacklist.map(o => o.trim().replace(/\*/g, '[\\pL0-9]*').replace(/\+/g, '[\\pL0-9]+'))) {
      if (value.length > 0) {
        const regexp = XRegExp(` [^\\s\\pL0-9\\w]?${value}[^\\s\\pL0-9\\w]? `, 'gi');
        // we need to change 'text' to ' text ' for regexp to correctly work
        if (XRegExp.exec(` ${opts.message} `, regexp)) {
          isOK = false;
          this.timeoutUser(opts.sender, opts.message,
            translate('moderation.user-is-warned-about-blacklist'),
            translate('moderation.user-have-timeout-for-blacklist'),
            timeoutValues[permId], 'blacklist');
          break;
        }
      }
    }
    return isOK;
  }

  async isSilent (name) {
    const item = await getRepository(ModerationMessageCooldown).findOne({ name });
    if (!item || (Date.now() - item.timestamp) >= 60000) {
      await getRepository(ModerationMessageCooldown).save({
        ...item, name, timestamp: Date.now(),
      });
      return false;
    }
    return true;
  }
}

export default new Moderation();
