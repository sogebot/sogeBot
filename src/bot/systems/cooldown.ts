import _ from 'lodash';
import XRegExp from 'xregexp';

import { isOwner, prepare, sendMessage } from '../commons';
import constants from '../constants';
import { command, default_permission, parser, rollback, settings } from '../decorators';
import Expects from '../expects';
import * as Parser from '../parser';
import { permission } from '../permissions';
import System from './_interface';

/*
 * !cooldown [keyword|!command] [global|user] [seconds] [true/false] - set cooldown for keyword or !command - 0 for disable, true/false set quiet mode
 * !cooldown toggle moderators [keyword|!command] [global|user]      - enable/disable specified keyword or !command cooldown for moderators
 * !cooldown toggle owners [keyword|!command] [global|user]          - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle subscribers [keyword|!command] [global|user]     - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle followers [keyword|!command] [global|user]       - enable/disable specified keyword or !command cooldown for owners
 * !cooldown toggle enabled [keyword|!command] [global|user]         - enable/disable specified keyword or !command cooldown
 */

class Cooldown extends System {
  @settings()
  cooldownNotifyAsWhisper: boolean = false;

  @settings()
  cooldownNotifyAsChat: boolean = true;

  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'cooldown', id: 'cooldown/list' });
  }

  @command('!cooldown')
  @default_permission(permission.CASTERS)
  async main (opts: Record<string, any>) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP_SET) as unknown as { [x: string]: string } | null;;

    if (_.isNil(match)) {
      let message = await prepare('cooldowns.cooldown-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    if (parseInt(match.seconds, 10) === 0) {
      await global.db.engine.remove(this.collection.data, { key: match.command, type: match.type });
      let message = await prepare('cooldowns.cooldown-was-unset', { type: match.type, command: match.command });
      sendMessage(message, opts.sender, opts.attr);
      return;
    }

    let cooldown = await global.db.engine.findOne(this.collection.data, { key: match.command, type: match.type });
    if (_.isEmpty(cooldown)) {await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000, type: match.type, timestamp: 0, quiet: _.isNil(match.quiet) ? false : match.quiet, enabled: true, owner: false, moderator: false, subscriber: true, follower: true });}
    else {await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, { miliseconds: parseInt(match.seconds, 10) * 1000 });}

    let message = await prepare('cooldowns.cooldown-was-set', { seconds: match.seconds, type: match.type, command: match.command });
    sendMessage(message, opts.sender, opts.attr);
  }

  @parser({ priority: constants.HIGH })
  async check (opts: Record<string, any>) {
    var data, viewer, timestamp, now;
    const [command, subcommand] = new Expects(opts.message)
      .command({ optional: true })
      .string({ optional: true })
      .toArray();

    if (!_.isNil(command)) { // command
      let key = subcommand ? `${command} ${subcommand}` : command;
      const parsed = await (new Parser.default().find(subcommand ? `${command} ${subcommand}` : command));
      if (parsed) {
        key = parsed.command;
      } else {
        // search in custom commands as well
        if (global.systems.customCommands.isEnabled()) {
          let commands: any = await global.db.engine.find(global.systems.customCommands.collection.data);
          commands = _(commands).flatMap().sortBy(o => -o.command.length).value();
          const customparsed = await (new Parser.default().find(subcommand ? `${command} ${subcommand}` : command, commands));
          if (customparsed) {
            key = customparsed.command;
          }
        }
      }

      let cooldown = await global.db.engine.findOne(this.collection.data, { key });
      if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
        const replace = new RegExp(`${XRegExp.escape(key)}`, 'ig');
        opts.message = opts.message.replace(replace, '');
        if (opts.message.length > 0) {return this.check(opts);}
        else {return true;}
      }
      data = [{
        key: cooldown.key,
        miliseconds: cooldown.miliseconds,
        type: cooldown.type,
        lastTimestamp: cooldown.lastTimestamp,
        timestamp: cooldown.timestamp,
        quiet: typeof cooldown.quiet === 'undefined' ? true : cooldown.quiet,
        enabled: typeof cooldown.enabled === 'undefined' ? true : cooldown.enabled,
        moderator: typeof cooldown.moderator === 'undefined' ? true : cooldown.moderator,
        subscriber: typeof cooldown.subscriber === 'undefined' ? true : cooldown.subscriber,
        follower: typeof cooldown.follower === 'undefined' ? true : cooldown.follower,
        owner: typeof cooldown.owner === 'undefined' ? true : cooldown.owner
      }];
    } else { // text
      let [keywords, cooldowns] = await Promise.all([global.db.engine.find(global.systems.keywords.collection.data), global.db.engine.find(this.collection.data)]);

      keywords = _.filter(keywords, function (o) {
        return opts.message.toLowerCase().search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword.toLowerCase()) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0;
      });

      data = [];
      _.each(keywords, (keyword) => {
        let cooldown = _.find(cooldowns, (o) => o.key.toLowerCase() === keyword.keyword.toLowerCase());
        if (keyword.enabled && !_.isEmpty(cooldown)) {
          data.push({
            key: cooldown.key,
            miliseconds: cooldown.miliseconds,
            type: cooldown.type,
            lastTimestamp: cooldown.lastTimestamp,
            timestamp: cooldown.timestamp,
            quiet: typeof cooldown.quiet === 'undefined' ? true : cooldown.quiet,
            enabled: typeof cooldown.enabled === 'undefined' ? true : cooldown.enabled,
            moderator: typeof cooldown.moderator === 'undefined' ? true : cooldown.moderator,
            subscriber: typeof cooldown.subscriber === 'undefined' ? true : cooldown.subscriber,
            follower: typeof cooldown.follower === 'undefined' ? true : cooldown.follower,
            owner: typeof cooldown.owner === 'undefined' ? true : cooldown.owner
          });
        }
      });
    }
    if (!_.some(data, { enabled: true })) { // parse ok if all cooldowns are disabled
      return true;
    }

    const user = await global.users.getById(opts.sender.userId);
    let result = false;
    const isMod = typeof opts.sender.badges.moderator !== 'undefined';
    const isSubscriber = typeof opts.sender.badges.subscriber !== 'undefined';
    const isFollower = user.is && user.is.follower ? user.is.follower : false;

    for (let cooldown of data) {
      if ((isOwner(opts.sender) && !cooldown.owner) || (isMod && !cooldown.moderator) || (isSubscriber && !cooldown.subscriber) || (isFollower && !cooldown.follower)) {
        result = true;
        continue;
      }

      viewer = await global.db.engine.findOne(this.collection.viewers, { username: opts.sender.username, key: cooldown.key });
      if (cooldown.type === 'global') {
        timestamp = cooldown.timestamp || 0;
      } else {
        timestamp = _.isNil(viewer.timestamp) ? 0 : viewer.timestamp;
      }
      now = new Date().getTime();

      if (now - timestamp >= cooldown.miliseconds) {
        if (cooldown.type === 'global') {
          await global.db.engine.update(this.collection.data, { key: cooldown.key, type: 'global' }, { lastTimestamp: timestamp, timestamp: now, key: cooldown.key, type: 'global' });
        } else {
          await global.db.engine.update(this.collection.viewers, { username: opts.sender.username, key: cooldown.key }, { lastTimestamp: timestamp, timestamp: now });
        }
        result = true;
        continue;
      } else {
        if (!cooldown.quiet && this.cooldownNotifyAsWhisper) {
          opts.sender['message-type'] = 'whisper'; // we want to whisp cooldown message
          let message = await prepare('cooldowns.cooldown-triggered', { command: cooldown.key, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
          await sendMessage(message, opts.sender, opts.attr);
        }
        if (!cooldown.quiet && this.cooldownNotifyAsChat) {
          opts.sender['message-type'] = 'chat';
          let message = await prepare('cooldowns.cooldown-triggered', { command: cooldown.key, seconds: Math.ceil((cooldown.miliseconds - now + timestamp) / 1000) });
          await sendMessage(message, opts.sender, opts.attr);
        }
        result = false;
        break; // disable _.each and updateQueue with false
      }
    }
    return result;
  }

  @rollback()
  async cooldownRollback (opts: Record<string, any>) {
    // TODO: redundant duplicated code (search of cooldown), should be unified for check and cooldownRollback
    var data, viewer;
    const [command, subcommand] = new Expects(opts.message)
      .command({ optional: true })
      .string({ optional: true })
      .toArray();

    if (!_.isNil(command)) { // command
      let key = subcommand ? `${command} ${subcommand}` : command;
      const parsed = await (new Parser.default().find(subcommand ? `${command} ${subcommand}` : command));
      if (parsed) {
        key = parsed.command;
      } else {
        // search in custom commands as well
        if (global.systems.customCommands.isEnabled()) {
          let commands = await global.db.engine.find(global.systems.customCommands.collection.data);
          commands = _(commands).flatMap().sortBy(o => -o.command.length).value();
          const customparsed = await (new Parser.default().find(subcommand ? `${command} ${subcommand}` : command, commands));
          if (customparsed) {
            key = customparsed.command;
          }
        }
      }

      let cooldown = await global.db.engine.findOne(this.collection.data, { key });
      if (_.isEmpty(cooldown)) { // command is not on cooldown -> recheck with text only
        const replace = new RegExp(`${XRegExp.escape(key)}`, 'ig');
        opts.message = opts.message.replace(replace, '');
        if (opts.message.length > 0) {return this.cooldownRollback(opts);}
        else {return true;}
      }
      data = [{
        key: cooldown.key,
        miliseconds: cooldown.miliseconds,
        type: cooldown.type,
        lastTimestamp: cooldown.lastTimestamp,
        timestamp: cooldown.timestamp,
        quiet: typeof cooldown.quiet === 'undefined' ? true : cooldown.quiet,
        enabled: typeof cooldown.enabled === 'undefined' ? true : cooldown.enabled,
        moderator: typeof cooldown.moderator === 'undefined' ? true : cooldown.moderator,
        subscriber: typeof cooldown.subscriber === 'undefined' ? true : cooldown.subscriber,
        follower: typeof cooldown.follower === 'undefined' ? true : cooldown.follower,
        owner: typeof cooldown.owner === 'undefined' ? true : cooldown.owner
      }];
    } else { // text
      let [keywords, cooldowns] = await Promise.all([global.db.engine.find(global.systems.keywords.collection.data), global.db.engine.find(this.collection.data)]);

      keywords = _.filter(keywords, function (o) {
        return opts.message.toLowerCase().search(new RegExp('^(?!\\!)(?:^|\\s).*(' + _.escapeRegExp(o.keyword.toLowerCase()) + ')(?=\\s|$|\\?|\\!|\\.|\\,)', 'gi')) >= 0;
      });

      data = [];
      _.each(keywords, (keyword) => {
        let cooldown = _.find(cooldowns, (o) => o.key.toLowerCase() === keyword.keyword.toLowerCase());
        if (keyword.enabled && !_.isEmpty(cooldown)) {
          data.push({
            key: cooldown.key,
            miliseconds: cooldown.miliseconds,
            type: cooldown.type,
            lastTimestamp: cooldown.lastTimestamp,
            timestamp: cooldown.timestamp,
            quiet: typeof cooldown.quiet === 'undefined' ? true : cooldown.quiet,
            enabled: typeof cooldown.enabled === 'undefined' ? true : cooldown.enabled,
            moderator: typeof cooldown.moderator === 'undefined' ? true : cooldown.moderator,
            subscriber: typeof cooldown.subscriber === 'undefined' ? true : cooldown.subscriber,
            follower: typeof cooldown.follower === 'undefined' ? true : cooldown.follower,
            owner: typeof cooldown.owner === 'undefined' ? true : cooldown.owner
          });
        }
      });
    }
    if (!_.some(data, { enabled: true })) { // parse ok if all cooldowns are disabled
      return true;
    }

    const user = await global.users.getById(opts.sender.userId);
    const isMod = typeof opts.sender.badges.moderator !== 'undefined';
    const isSubscriber = typeof opts.sender.badges.subscriber !== 'undefined';
    const isFollower = user.is && user.is.follower ? user.is.follower : false;

    for (let cooldown of data) {
      if ((isOwner(opts.sender) && !cooldown.owner) || (isMod && !cooldown.moderator) || (isSubscriber && !cooldown.subscriber) || (isFollower && !cooldown.follower)) {
        continue;
      }

      viewer = await global.db.engine.findOne(this.collection.viewers, { username: opts.sender.username, key: cooldown.key });

      // rollback to lastTimestamp
      if (cooldown.type === 'global') {
        await global.db.engine.update(this.collection.data, { key: cooldown.key, type: 'global' }, { lastTimestamp: cooldown.lastTimestamp, timestamp: cooldown.lastTimestamp, key: cooldown.key, type: 'global' });
      } else {
        await global.db.engine.update(this.collection.viewers, { username: opts.sender.username, key: cooldown.key }, { lastTimestamp: viewer.lastTimestamp, timestamp: viewer.lastTimestamp });
      }
    }
  }

  async toggle (opts: Record<string, any>, type: string) {
    const match = XRegExp.exec(opts.parameters, constants.COOLDOWN_REGEXP) as unknown as { [x: string]: string } | null;

    if (_.isNil(match)) {
      let message = await prepare('cooldowns.cooldown-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const cooldown = await global.db.engine.findOne(this.collection.data, { key: match.command, type: match.type });
    if (_.isEmpty(cooldown)) {
      let message = await prepare('cooldowns.cooldown-not-found', { command: match.command });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    if (type === 'type') {
      cooldown[type] = cooldown[type] === 'global' ? 'user' : 'global';
    } else {cooldown[type] = !cooldown[type];}

    delete cooldown._id;
    await global.db.engine.update(this.collection.data, { key: match.command, type: match.type }, cooldown);

    let path = '';
    let status = cooldown[type] ? 'enabled' : 'disabled';

    if (type === 'moderator') {path = '-for-moderators';}
    if (type === 'owner') {path = '-for-owners';}
    if (type === 'subscriber') {path = '-for-subscribers';}
    if (type === 'follower') {path = '-for-followers';}
    if (type === 'quiet' || type === 'type') {return;} // those two are setable only from dashboard

    let message = await prepare(`cooldowns.cooldown-was-${status}${path}`, { command: cooldown.key });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!cooldown toggle enabled')
  @default_permission(permission.CASTERS)
  async toggleEnabled (opts: Record<string, any>) { await this.toggle(opts, 'enabled'); }

  @command('!cooldown toggle moderators')
  @default_permission(permission.CASTERS)
  async toggleModerators (opts: Record<string, any>) { await this.toggle(opts, 'moderator'); }

  @command('!cooldown toggle owners')
  @default_permission(permission.CASTERS)
  async toggleOwners (opts: Record<string, any>) { await this.toggle(opts, 'owner'); }

  @command('!cooldown toggle subscribers')
  @default_permission(permission.CASTERS)
  async toggleSubscribers (opts: Record<string, any>) { await this.toggle(opts, 'subscriber'); }

  @command('!cooldown toggle followers')
  @default_permission(permission.CASTERS)
  async toggleFollowers (opts: Record<string, any>) { await this.toggle(opts, 'follower'); }

  async toggleNotify (opts: Record<string, any>) { await this.toggle(opts, 'quiet'); }
  async toggleType (opts: Record<string, any>) { await this.toggle(opts, 'type'); }
}

export default Cooldown;
export { Cooldown };