// 3rdparty libraries

import * as constants from '@sogebot/ui-helpers/constants';
import emojiRegex from 'emoji-regex';
import * as _ from 'lodash';
import tlds from 'tlds';
import { getRepository, LessThan } from 'typeorm';
import XRegExp from 'xregexp';

import { parserReply } from '../commons';
import { Alias } from '../database/entity/alias';
import { ModerationPermit, ModerationWarning } from '../database/entity/moderation';
import {
  command, default_permission, parser, permission_settings, settings, ui,
} from '../decorators';
import Expects from '../expects';
import { prepare } from '../helpers/commons';
import { getLocalizedName } from '../helpers/getLocalized';
import {
  error, timeout as timeoutLog, warning as warningLog,
} from '../helpers/log';
import { ParameterError } from '../helpers/parameterError';
import { getUserHighestPermission } from '../helpers/permissions/';
import { defaultPermissions } from '../helpers/permissions/';
import { adminEndpoint } from '../helpers/socket';
import { timeout } from '../helpers/tmi';
import { isModerator } from '../helpers/user/isModerator';
import spotify from '../integrations/spotify';
import Message from '../message';
import tmi from '../tmi';
import { translate } from '../translate';
import users from '../users';
import System from './_interface';
import aliasSystem from './alias';
import songs from './songs';

const urlRegex = [
  new RegExp(`(www)? ??\\.? ?[a-zA-Z0-9]+([a-zA-Z0-9-]+) ??\\. ?(${tlds.join('|')})(?=\\P{L}|$)`, 'igu'),
  new RegExp(`[a-zA-Z0-9]+([a-zA-Z0-9-]+)?\\.(${tlds.join('|')})(?=\\P{L}|$)`, 'igu'),
];

const timeoutType = ['links', 'symbols', 'caps', 'longmessage', 'spam', 'color', 'emotes', 'blacklist'] as const;
const ModerationMessageCooldown = new Map<typeof timeoutType[number], number>();
const immuneUsers = new Map<typeof timeoutType[number], Map<string, number>>([
  ['links', new Map()],
  ['symbols', new Map()],
  ['caps', new Map()],
  ['longmessage', new Map()],
  ['spam', new Map()],
  ['color', new Map()],
  ['emotes', new Map()],
  ['blacklist', new Map()],
]);

setInterval(() => {
  // cleanup map
  for (const type of timeoutType) {
    const map = immuneUsers.get(type);
    if (map) {
      for (const userId of map.keys()) {
        const immuneExpiresIn = map.get(userId);
        if(immuneExpiresIn && immuneExpiresIn < Date.now()) {
          map.delete(userId);
        }
      }
    }
  }
}, 1000);

class Moderation extends System {
  @settings('lists')
  cListsWhitelist: string[] = [];
  @settings('lists')
  @ui({
    type:   'textarea-from-array',
    secret: true,
  })
  cListsBlacklist: string[] = [];
  @permission_settings('lists', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cListsEnabled = true;
  @permission_settings('lists', [ defaultPermissions.CASTERS ])
  cListsTimeout = 120;

  @permission_settings('links_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cLinksEnabled = true;
  @permission_settings('links_filter', [ defaultPermissions.CASTERS ])
  cLinksIncludeSpaces = false;
  @permission_settings('links_filter', [ defaultPermissions.CASTERS ])
  cLinksIncludeClips = true;
  @permission_settings('links_filter', [ defaultPermissions.CASTERS ])
  cLinksTimeout = 120;

  @permission_settings('symbols_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cSymbolsEnabled = true;
  @permission_settings('symbols_filter', [ defaultPermissions.CASTERS ])
  cSymbolsTriggerLength = 15;
  @permission_settings('symbols_filter', [ defaultPermissions.CASTERS ])
  cSymbolsMaxSymbolsConsecutively = 10;
  @permission_settings('symbols_filter', [ defaultPermissions.CASTERS ])
  cSymbolsMaxSymbolsPercent = 50;
  @permission_settings('symbols_filter', [ defaultPermissions.CASTERS ])
  cSymbolsTimeout = 120;

  @permission_settings('longMessage_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cLongMessageEnabled = true;
  @permission_settings('longMessage_filter', [ defaultPermissions.CASTERS ])
  cLongMessageTriggerLength = 300;
  @permission_settings('longMessage_filter', [ defaultPermissions.CASTERS ])
  cLongMessageTimeout = 120;

  @permission_settings('caps_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cCapsEnabled = true;
  @permission_settings('caps_filter', [ defaultPermissions.CASTERS ])
  cCapsTriggerLength = 15;
  @permission_settings('caps_filter', [ defaultPermissions.CASTERS ])
  cCapsMaxCapsPercent = 50;
  @permission_settings('caps_filter', [ defaultPermissions.CASTERS ])
  cCapsTimeout = 120;

  @permission_settings('spam_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cSpamEnabled = true;
  @permission_settings('spam_filter', [ defaultPermissions.CASTERS ])
  cSpamTriggerLength = 15;
  @permission_settings('spam_filter', [ defaultPermissions.CASTERS ])
  cSpamMaxLength = 50;
  @permission_settings('spam_filter', [ defaultPermissions.CASTERS ])
  cSpamTimeout = 300;

  @permission_settings('color_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cColorEnabled = true;
  @permission_settings('color_filter', [ defaultPermissions.CASTERS ])
  cColorTimeout = 300;

  @permission_settings('emotes_filter', [ defaultPermissions.CASTERS ], { [defaultPermissions.MODERATORS]: false })
  cEmotesEnabled = true;
  @permission_settings('emotes_filter', [ defaultPermissions.CASTERS ])
  cEmotesEmojisAreEmotes = true;
  @permission_settings('emotes_filter', [ defaultPermissions.CASTERS ])
  cEmotesMaxCount = 15;
  @permission_settings('emotes_filter', [ defaultPermissions.CASTERS ])
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
    adminEndpoint(this.nsp, 'lists.set', (data) => {
      this.cListsBlacklist = data.blacklist.filter(entry => entry.trim() !== '');
      this.cListsWhitelist = data.whitelist.filter(entry => entry.trim() !== '');
    });
  }

  @command('!immune')
  @default_permission(defaultPermissions.CASTERS)
  public async immune(opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const [ username, type, time ] = new Expects(opts.parameters)
        .username()
        .oneOf({ values: timeoutType })
        .duration({})
        .toArray();

      const userId = await users.getIdByName(username);

      const map = immuneUsers.get(type);
      if (map) {
        map.set(String(userId), Date.now() + Number(time));
      }

      return [{
        response: prepare('moderation.user-have-immunity', {
          username,
          type,
          time: time / 1000,
        }), ...opts,
      }];
    } catch (err: any) {
      const isParameterError = (err instanceof ParameterError);

      if (isParameterError) {
        return [{ response: prepare('moderation.user-have-immunity-parameterError', { command: opts.command }), ...opts }, { response: '# <type> - ' + timeoutType.join(', '), ...opts }, { response: '# <duration> - 5s, 10m, 12h, 1d', ...opts }];
      } else {
        error(err.stack);
        return [{ response: '$sender, unknown error, please check your logs', ...opts }];
      }
    }
  }

  async timeoutUser (sender: CommandOptions['sender'], text: string, warning: string, msg: string, time: number, type: typeof timeoutType[number] ) {
    // cleanup warnings
    await getRepository(ModerationWarning).delete({ timestamp: LessThan(Date.now() - 1000 * 60 * 60) });
    const warnings = await getRepository(ModerationWarning).find({ userId: sender.userId });
    const silent = await this.isSilent(type);

    text = text.trim();

    if (this.cWarningsAllowedCount === 0) {
      timeoutLog(`${sender.username} [${type}] ${time}s timeout | ${text}`);
      timeout(sender.username, time, isModerator(sender));
      return;
    }

    const isWarningCountAboveThreshold = warnings.length >= this.cWarningsAllowedCount;
    if (isWarningCountAboveThreshold) {
      timeoutLog(`${sender.username} [${type}] ${time}s timeout | ${text}`);
      timeout(sender.username, time, isModerator(sender));
      await getRepository(ModerationWarning).delete({ userId: sender.userId });
    } else {
      await getRepository(ModerationWarning).insert({ userId: sender.userId, timestamp: Date.now() });
      const warningsLeft = this.cWarningsAllowedCount - warnings.length;
      warning = await new Message(warning.replace(/\$count/g, String(warningsLeft < 0 ? 0 : warningsLeft))).parse();
      if (this.cWarningsShouldClearChat) {
        timeoutLog(`${sender.username} [${type}] 1s timeout, warnings left ${warningsLeft < 0 ? 0 : warningsLeft} | ${text}`);
        timeout(sender.username, 1, isModerator(sender));
      }

      if (this.cWarningsAnnounceTimeouts) {
        tmi.delete('bot', sender.id);
        if (!silent) {
          parserReply('$sender, ' + warning, { sender });
        } else {
          warningLog(`Moderation announce was not sent (another ${type} warning already sent in 60s): ${sender.username}, ${warning}`);
        }
      }
    }
  }

  async whitelist (text: string, permId: string | null) {
    let ytRegex, clipsRegex, spotifyRegex;

    // check if spotify -or- alias of spotify contain open.spotify.com link
    if (spotify.enabled) {
      const cmd = (await spotify.commands()).find(o => o._fncName === 'main')?.command ?? '!spotify';
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
      const cmd = songs.getCommand('!songrequest');
      const alias = await getRepository(Alias).findOne({ where: { command: cmd } });
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
        clipsRegex = /.*(clips.twitch.tv\/)(\w+)/g;
        text = text.replace(clipsRegex, '');
        clipsRegex = /.*(www.twitch.tv\/\w+\/clip\/)(\w+)/g;
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
  @default_permission(defaultPermissions.CASTERS)
  async permitLink (opts: CommandOptions): Promise<CommandResponse[]> {
    try {
      const parsed = opts.parameters.match(/^@?([\S]+) ?(\d+)?$/);
      if (!parsed) {
        throw new Error('!permit command not parsed');
      }
      let count = 1;
      if (!_.isNil(parsed[2])) {
        count = parseInt(parsed[2], 10);
      }

      const userId = await users.getIdByName(parsed[1].toLowerCase());
      for (let i = 0; i < count; i++) {
        await getRepository(ModerationPermit).insert({ userId });
      }

      const response = prepare('moderation.user-have-link-permit', {
        username: parsed[1].toLowerCase(), link: getLocalizedName(count, translate('core.links')), count: count,
      });
      return [{ response, ...opts }];
    } catch (e: any) {
      return [{ response: translate('moderation.permit-parse-failed'), ...opts }];
    }
  }

  @parser({ priority: constants.MODERATION })
  async containsLink (opts: ParserOptions) {
    if (!opts.sender || immuneUsers.get('links')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cLinksEnabled');
    const cLinksIncludeSpaces = await this.getPermissionBasedSettingsValue('cLinksIncludeSpaces');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cLinksTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
      return true;
    }

    const whitelisted = await this.whitelist(opts.message, permId);
    if (whitelisted.search(urlRegex[cLinksIncludeSpaces[permId] ? 0 : 1]) >= 0) {
      const permit = await getRepository(ModerationPermit).findOne({ userId: opts.sender.userId });
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
    if (!opts.sender || immuneUsers.get('symbols')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cSymbolsEnabled');
    const cSymbolsTriggerLength = await this.getPermissionBasedSettingsValue('cSymbolsTriggerLength');
    const cSymbolsMaxSymbolsConsecutively = await this.getPermissionBasedSettingsValue('cSymbolsMaxSymbolsConsecutively');
    const cSymbolsMaxSymbolsPercent = await this.getPermissionBasedSettingsValue('cSymbolsMaxSymbolsPercent');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cSymbolsTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
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
      const symbols = out[Number(item)];
      if (symbols.length >= cSymbolsMaxSymbolsConsecutively[permId]) {
        this.timeoutUser(opts.sender, opts.message,
          translate('moderation.user-is-warned-about-symbols'),
          translate('moderation.user-have-timeout-for-symbols'),
          timeoutValues[permId], 'symbols');
        return false;
      }
      symbolsLength = symbolsLength + symbols.length;
    }
    if (Math.ceil(symbolsLength / (msgLength / 100)) >= cSymbolsMaxSymbolsPercent[permId]) {
      this.timeoutUser(opts.sender, opts.message, translate('moderation.user-is-warned-about-symbols'), translate('moderation.symbols'), timeoutValues[permId], 'symbols');
      return false;
    }
    return true;
  }

  @parser({ priority: constants.MODERATION })
  async longMessage (opts: ParserOptions) {
    if (!opts.sender || immuneUsers.get('longmessage')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cLongMessageEnabled');
    const cLongMessageTriggerLength = await this.getPermissionBasedSettingsValue('cLongMessageTriggerLength');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cLongMessageTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
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
    if (!opts.sender || immuneUsers.get('caps')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cCapsEnabled');
    const cCapsTriggerLength = await this.getPermissionBasedSettingsValue('cCapsTriggerLength');
    const cCapsMaxCapsPercent = await this.getPermissionBasedSettingsValue('cCapsMaxCapsPercent');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cCapsTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
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
      if (emotesCharList.includes(i) || whitelisted.charAt(i).match(regexp) !== null) {
        msgLength--;
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
    if (!opts.sender || immuneUsers.get('spam')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cSpamEnabled');
    const cSpamTriggerLength = await this.getPermissionBasedSettingsValue('cSpamTriggerLength');
    const cSpamMaxLength = await this.getPermissionBasedSettingsValue('cSpamMaxLength');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cSpamTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
      return true;
    }
    const whitelisted = await this.whitelist(opts.message,permId);

    const msgLength = whitelisted.trim().length;

    if (msgLength < cSpamTriggerLength[permId]) {
      return true;
    }
    const out = whitelisted.match(/(.+)(\1+)/g);
    for (const item in out) {
      if (out[Number(item)].length >= cSpamMaxLength[permId]) {
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
    if (!opts.sender || immuneUsers.get('color')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cColorEnabled');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cColorTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
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
    if (!opts.sender || immuneUsers.get('emotes')?.has(String(opts.sender.userId))) {
      return true;
    }

    if (!(Symbol.iterator in Object(opts.sender.emotes))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cEmotesEnabled');
    const cEmotesEmojisAreEmotes = await this.getPermissionBasedSettingsValue('cEmotesEmojisAreEmotes');
    const cEmotesMaxCount = await this.getPermissionBasedSettingsValue('cEmotesMaxCount');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cEmotesTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
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
    if (!opts.sender || immuneUsers.get('blacklist')?.has(String(opts.sender.userId))) {
      return true;
    }

    const enabled = await this.getPermissionBasedSettingsValue('cListsEnabled');
    const timeoutValues = await this.getPermissionBasedSettingsValue('cListsTimeout');
    const permId = await getUserHighestPermission(opts.sender.userId);

    if (!enabled[permId] || permId === defaultPermissions.CASTERS) {
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
            translate('moderation.user-is-warned-about-forbidden-words'),
            translate('moderation.user-have-timeout-for-forbidden-words'),
            timeoutValues[permId], 'blacklist');
          break;
        }
      }
    }
    return isOK;
  }

  async isSilent (name: typeof timeoutType[number]) {
    const cooldown = ModerationMessageCooldown.get(name);
    if (!cooldown || (Date.now() - cooldown) >= 60000) {
      ModerationMessageCooldown.set(name, Date.now());
      return false;
    }
    return true;
  }
}

export default new Moderation();
