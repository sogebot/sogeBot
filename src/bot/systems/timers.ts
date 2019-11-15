'use strict';

import * as _ from 'lodash';
import { isMainThread } from '../cluster';

import { sendMessage } from '../commons';
import { command, default_permission } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';
import { adminEndpoint } from '../helpers/socket';

import { getRepository } from 'typeorm';
import { Timer, TimerResponse } from '../database/entity/timer';
import Expects from '../expects';

/*
 * !timers                                                                                                                      - gets an info about timers usage
 * !timers set -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] - add new timer
 * !timers unset -name [name-of-timer]                                                                                          - remove timer
 * !timers add -name [name-of-timer] -response '[response]'                                                                     - add new response to timer
 * !timers rm -id [response-id]                                                                                                 - remove response by id
 * !timers toggle -name [name-of-timer]                                                                                         - enable/disable timer by name
 * !timers toggle -id [id-of-response]                                                                                          - enable/disable response by id
 * !timers list                                                                                                                 - get timers list
 * !timers list -name [name-of-timer]                                                                                           - get list of responses on timer
 */

class Timers extends System {
  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'timers', id: 'manage/timers/list' });
    if (isMainThread) {

      this.init();
    }
  }

  sockets () {
    adminEndpoint(this.nsp, 'timers::getAll', async (callback) => {
      const timers = await getRepository(Timer).find({
        relations: ['messages'],
      });
      callback(null, timers);
    });
    adminEndpoint(this.nsp, 'timers::getOne', async (id, callback) => {
      const timer = await getRepository(Timer).findOne({
        relations: ['messages'],
        where: {
          id,
        },
      });
      callback(null, timer);
    });
    adminEndpoint(this.nsp, 'timers::remove', async (id, callback) => {
      const timer = await getRepository(Timer).findOne({
        where: {
          id,
        },
      });
      if (timer) {
        await getRepository(Timer).remove(timer);
      }
      callback(null);
    });
    adminEndpoint(this.nsp, 'timers::save', async (data, callback) => {
      try {
        data = await getRepository(Timer).save(data);
        callback(null, data);
      } catch (e) {
        callback(e);
      }
    });
  }

  @command('!timers')
  @default_permission(permission.CASTERS)
  async main (opts) {
    const [main, set, unset, add, rm, toggle, list] = [
      this.getCommand('!timers'),
      this.getCommand('!timers set'),
      this.getCommand('!timers unset'),
      this.getCommand('!timers add'),
      this.getCommand('!timers rm'),
      this.getCommand('!timers toggle'),
      this.getCommand('!timers list'),
    ];
    sendMessage('╔ ' + global.translate('core.usage'), opts.sender, opts.attr);
    sendMessage(`║ ${main} - gets an info about timers usage`, opts.sender, opts.attr);
    sendMessage(`║ ${set} -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] - add new timer`, opts.sender, opts.attr);
    sendMessage(`║ ${unset} -name [name-of-timer] - remove timer`, opts.sender, opts.attr);
    sendMessage(`║ ${add} -name [name-of-timer] -response '[response]' - add new response to timer`, opts.sender, opts.attr);
    sendMessage(`║ ${rm} -id [response-id] - remove response by id`, opts.sender, opts.attr);
    sendMessage(`║ ${toggle} -name [name-of-timer] - enable/disable timer by name`, opts.sender, opts.attr);
    sendMessage(`║ ${toggle} -id [id-of-response] - enable/disable response by id`, opts.sender, opts.attr);
    sendMessage(`║ ${list} - get timers list`, opts.sender, opts.attr);
    sendMessage(`╚ ${list} -name [name-of-timer] - get list of responses on timer`, opts.sender, opts.attr);
  }

  async init () {
    const timers = await getRepository(Timer).find({
      relations: ['messages'],
    });
    for (const timer of timers) {
      timer.triggeredAtMessages = 0;
      timer.triggeredAtTimestamp = Date.now();
      await getRepository(Timer).save(timer);
    }
    this.check();
  }

  async check () {
    clearTimeout(this.timeouts.timersCheck);

    const timers = await getRepository(Timer).find({
      relations: ['messages'],
      where: { isEnabled: true },
    });
    for (const timer of timers) {
      if (timer.triggerEveryMessage > 0 && timer.triggeredAtMessages - global.linesParsed + timer.triggerEveryMessage > 0) {
        continue;
      } // not ready to trigger with messages
      if (timer.triggerEverySecond > 0 && new Date().getTime() - timer.triggeredAtTimestamp < timer.triggerEverySecond * 1000) {
        continue;
      } // not ready to trigger with seconds

      const response = _.orderBy(timer.messages, 'timestamp', 'asc')[0];

      if (response) {
        sendMessage(response.response, {
          username: global.oauth.botUsername,
          displayName: global.oauth.botUsername,
          userId: Number(global.oauth.botId),
          emotes: [],
          badges: {},
          'message-type': 'chat',
        });
        response.timestamp = Date.now();
        await getRepository(TimerResponse).save(response);
      }
      timer.triggeredAtMessages = global.linesParsed;
      timer.triggeredAtTimestamp = Date.now();
      await getRepository(Timer).save(timer);
    }
    this.timeouts.timersCheck = global.setTimeout(() => this.check(), 1000); // this will run check 1s after full check is correctly done
  }

  async editName (self, socket, data) {
    if (data.value.length === 0) {
      await self.unset(self, null, `-name ${data.id}`);
    } else {
      const name = data.value.match(/([a-zA-Z0-9_]+)/);
      if (_.isNil(name)) {
        return;
      }
      await getRepository(Timer).update({ name: data.id }, { name: name[0] });
    }
  }

  async editResponse (self, socket, data) {
    if (data.value.length === 0) {
      await self.rm(self, null, `-id ${data.id}`);
    } else {
      await getRepository(TimerResponse).update({ id: data.id }, { response: data.value });
    }
  }

  @command('!timers set')
  @default_permission(permission.CASTERS)
  async set (opts) {
    // -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60]
    let name = opts.parameters.match(/-name ([a-zA-Z0-9_]+)/);
    let messages = opts.parameters.match(/-messages ([0-9]+)/);
    let seconds = opts.parameters.match(/-seconds ([0-9]+)/);

    if (_.isNil(name)) {
      sendMessage(global.translate('timers.name-must-be-defined'), opts.sender, opts.attr);
      return false;
    } else {
      name = name[1];
    }

    messages = _.isNil(messages) ? 0 : parseInt(messages[1], 10);
    seconds = _.isNil(seconds) ? 60 : parseInt(seconds[1], 10);

    if (messages === 0 && seconds === 0) {
      sendMessage(global.translate('timers.cannot-set-messages-and-seconds-0'), opts.sender, opts.attr);
      return false;
    }
    let timer = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name },
    });
    if (!timer) {
      timer = new Timer();
    }
    timer.name = name;
    timer.triggerEveryMessage = messages;
    timer.triggerEverySecond = seconds;
    timer.isEnabled = true;
    timer.triggeredAtMessages = global.linesParsed;
    timer.triggeredAtTimestamp = Date.now();
    await getRepository(Timer).save(timer);
    sendMessage(global.translate('timers.timer-was-set')
      .replace(/\$name/g, name)
      .replace(/\$messages/g, messages)
      .replace(/\$seconds/g, seconds), opts.sender);
  }

  @command('!timers unset')
  @default_permission(permission.CASTERS)
  async unset (opts) {
    // -name [name-of-timer]
    let name = opts.parameters.match(/-name ([\S]+)/);

    if (_.isNil(name)) {
      sendMessage(global.translate('timers.name-must-be-defined'), opts.sender, opts.attr);
      return false;
    } else {
      name = name[1];
    }

    const timer = await getRepository(Timer).findOne({ name: name });
    if (!timer) {
      sendMessage(global.translate('timers.timer-not-found').replace(/\$name/g, name), opts.sender, opts.attr);
      return false;
    }

    await getRepository(Timer).remove(timer);
    sendMessage(global.translate('timers.timer-deleted')
      .replace(/\$name/g, name), opts.sender);
  }

  @command('!timers rm')
  @default_permission(permission.CASTERS)
  async rm (opts) {
    // -id [id-of-response]
    try {
      const id = new Expects(opts.parameters).argument({ type: 'uuid', name: 'id' }).toArray()[0];
      await getRepository(TimerResponse).delete({ id });
      sendMessage(global.translate('timers.response-deleted')
        .replace(/\$id/g, id), opts.sender);
    } catch (e) {
      sendMessage(global.translate('timers.id-must-be-defined'), opts.sender, opts.attr);
      return false;
    }
  }

  @command('!timers add')
  @default_permission(permission.CASTERS)
  async add (opts) {
    // -name [name-of-timer] -response '[response]'
    let name = opts.parameters.match(/-name ([\S]+)/);
    let response = opts.parameters.match(/-response ['"](.+)['"]/);

    if (_.isNil(name)) {
      sendMessage(global.translate('timers.name-must-be-defined'), opts.sender, opts.attr);
      return false;
    } else {
      name = name[1];
    }

    if (_.isNil(response)) {
      sendMessage(global.translate('timers.response-must-be-defined'), opts.sender, opts.attr);
      return false;
    } else {
      response = response[1];
    }
    const timer = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name },
    });
    if (!timer) {
      sendMessage(global.translate('timers.timer-not-found')
        .replace(/\$name/g, name), opts.sender);
      return false;
    }

    const message = new TimerResponse();
    message.isEnabled = true;
    message.timestamp = Date.now();
    message.response = response;
    message.timer = timer;
    const item = await getRepository(TimerResponse).save(message);

    sendMessage(global.translate('timers.response-was-added')
      .replace(/\$id/g, item.id)
      .replace(/\$name/g, name)
      .replace(/\$response/g, response), opts.sender);
  }

  @command('!timers list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    // !timers list -name [name-of-timer]
    let name = opts.parameters.match(/-name ([\S]+)/);

    if (_.isNil(name)) {
      const timers = await getRepository(Timer).find();
      sendMessage(global.translate('timers.timers-list').replace(/\$list/g, _.map(_.orderBy(timers, 'name'), (o) => (o.isEnabled ? '⚫' : '⚪') + ' ' + o.name).join(', ')), opts.sender, opts.attr);
      return true;
    } else {
      name = name[1];
    }

    const timer = await getRepository(Timer).findOne({
      relations: ['messages'],
      where: { name },
    });
    if (!timer) {
      sendMessage(global.translate('timers.timer-not-found')
        .replace(/\$name/g, name), opts.sender);
      return false;
    }
    await sendMessage(global.translate('timers.responses-list').replace(/\$name/g, name), opts.sender, opts.attr);
    for (const response of timer.messages) {
      await sendMessage((response.isEnabled ? '⚫ ' : '⚪ ') + `${response.id} - ${response.response}`, opts.sender, opts.attr);
    }
    return true;
  }

  @command('!timers toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts) {
    // -name [name-of-timer] or -id [id-of-response]
    const [id, name] = new Expects(opts.parameters)
      .argument({ type: 'uuid', name: 'id', optional: true })
      .argument({ type: String, name: 'name', optional: true })
      .toArray();

    if ((_.isNil(id) && _.isNil(name)) || (!_.isNil(id) && !_.isNil(name))) {
      sendMessage(global.translate('timers.id-or-name-must-be-defined'), opts.sender, opts.attr);
      return false;
    }

    if (!_.isNil(id)) {
      const response = await getRepository(TimerResponse).findOne({ id });
      if (!response) {
        sendMessage(global.translate('timers.response-not-found').replace(/\$id/g, id), opts.sender, opts.attr);
        return false;
      }

      response.isEnabled = !response.isEnabled;
      await getRepository(TimerResponse).save(response);
      sendMessage(global.translate(response.isEnabled ? 'timers.response-enabled' : 'timers.response-disabled')
        .replace(/\$id/g, id), opts.sender);
      return true;
    }

    if (!_.isNil(name)) {
      const timer = await getRepository(Timer).findOne({ name: name });
      if (!timer) {
        sendMessage(global.translate('timers.timer-not-found').replace(/\$name/g, name), opts.sender, opts.attr);
        return false;
      }

      timer.isEnabled = !timer.isEnabled;
      await getRepository(Timer).save(timer);
      sendMessage(global.translate(timer.isEnabled ? 'timers.timer-enabled' : 'timers.timer-disabled')
        .replace(/\$name/g, name), opts.sender);
      return true;
    }
  }
}

export default Timers;
export { Timers };
