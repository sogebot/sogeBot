import {
  Timer, TimerResponse,
} from '@entity/timer.js';
import { Mutex } from 'async-mutex';
import { validateOrReject } from 'class-validator';
import * as _ from 'lodash-es';
import { merge, sortBy } from 'lodash-es';

import System from './_interface.js';
import { command, default_permission } from '../decorators.js';
import { Expects } from  '../expects.js';

import { onStartup } from '~/decorators/on.js';
import { isStreamOnline } from '~/helpers/api/index.js';
import { announce } from '~/helpers/commons/index.js';
import { isDbConnected } from '~/helpers/database.js';
import { app } from '~/helpers/panel.js';
import { linesParsed } from '~/helpers/parser.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { adminMiddleware } from '~/socket.js';
import { translate } from '~/translate.js';

/*
 * !timers                                                                                                                                 - gets an info about timers usage
 * !timers set -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] [-offline] - add new timer
 * !timers unset -name [name-of-timer]                                                                                                     - remove timer
 * !timers add -name [name-of-timer] -response '[response]'                                                                                - add new response to timer
 * !timers rm -id [response-id]                                                                                                            - remove response by id
 * !timers toggle -name [name-of-timer]                                                                                                    - enable/disable timer by name
 * !timers toggle -id [id-of-response]                                                                                                     - enable/disable response by id
 * !timers list                                                                                                                            - get timers list
 * !timers list -name [name-of-timer]                                                                                                      - get list of responses on timer
 */
const mutex = new Mutex();

class Timers extends System {
  sockets() {
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/systems/timer', adminMiddleware, async (req, res) => {
      res.send({
        data: await Timer.find({ relations: ['messages'] }),
      });
    });
    app.get('/api/systems/timer/:id', adminMiddleware, async (req, res) => {
      res.send({
        data: await Timer.findOne({ where: { id: req.params.id }, relations: ['messages'] }),
      });
    });
    app.delete('/api/systems/timer/:id', adminMiddleware, async (req, res) => {
      await Timer.delete({ id: req.params.id });
      res.status(404).send();
    });
    app.post('/api/systems/timer', adminMiddleware, async (req, res) => {
      try {
        const itemToSave = new Timer();
        merge(itemToSave, req.body);
        await validateOrReject(itemToSave);
        await itemToSave.save();

        await TimerResponse.delete({ timer: { id: itemToSave.id } });
        const responses = req.body.messages;
        for (const response of responses) {
          const resToSave = new TimerResponse();
          merge(resToSave, response);
          resToSave.timer = itemToSave;
          await resToSave.save();
        }

        res.send({ data: itemToSave });
      } catch (e) {
        res.status(400).send({ errors: e });
      }
    });
  }

  @command('!timers')
  @default_permission(defaultPermissions.CASTERS)
  main (opts: CommandOptions): CommandResponse[] {
    let url = 'http://sogebot.github.io/sogeBot/#/systems/timers';
    if ((process.env?.npm_package_version ?? 'x.y.z-SNAPSHOT').includes('SNAPSHOT')) {
      url = 'http://sogebot.github.io/sogeBot/#/_master/systems/timers';
    }
    return [{ response: translate('core.usage') + ' => ' + url, ...opts }];
  }

  @onStartup()
  async init () {
    if (!isDbConnected) {
      setTimeout(() => this.init(), 1000);
      return;
    }

    this.addMenu({
      category: 'manage', name: 'timers', id: 'manage/timers', this: this,
    });
    const timers = await Timer.find({ relations: ['messages'] });
    for (const timer of timers) {
      timer.triggeredAtMessages = 0;
      timer.triggeredAtTimestamp = new Date().toISOString();
      await timer.save();
    }

    setInterval(async () => {
      if (!mutex.isLocked()) {
        const release = await mutex.acquire();
        try {
          await this.check();
        } finally {
          release();
        }
      }
    }, 1000);
  }

  announceResponse (responses: TimerResponse[]) {
    // check if at least one response is enabled
    if (responses.filter(o => o.isEnabled).length === 0) {
      return;
    }

    responses = _.orderBy(responses, 'timestamp', 'asc');
    const response = responses.shift();
    if (response) {
      TimerResponse.update({ id: response.id }, { timestamp: new Date().toISOString() });
      if (!response.isEnabled) {
        // go to next possibly enabled response
        this.announceResponse(responses);
      } else {
        announce(response.response, 'timers');
      }
    }
  }

  async check () {
    if (!isStreamOnline.value) {
      await Timer.update({ tickOffline: false }, { triggeredAtMessages: linesParsed, triggeredAtTimestamp: new Date().toISOString() });
    }

    const timers = await Timer.find({
      relations: ['messages'],
      where:     isStreamOnline.value ? { isEnabled: true } : { isEnabled: true, tickOffline: true },
    });

    for (const timer of timers) {
      if (timer.triggerEveryMessage > 0 && (timer.triggeredAtMessages || 0) - linesParsed + timer.triggerEveryMessage > 0) {
        continue;
      } // not ready to trigger with messages
      if (timer.triggerEverySecond > 0 && new Date().getTime() - new Date(timer.triggeredAtTimestamp || 0).getTime() < timer.triggerEverySecond * 1000) {
        continue;
      } // not ready to trigger with seconds

      this.announceResponse(timer.messages);
      await Timer.update({ id: timer.id }, { triggeredAtMessages: linesParsed, triggeredAtTimestamp: new Date().toISOString() });
    }
  }

  @command('!timers set')
  @default_permission(defaultPermissions.CASTERS)
  async set (opts: CommandOptions): Promise<CommandResponse[]> {
    // -name [name-of-timer] -messages [num-of-msgs-to-trigger|default:0] -seconds [trigger-every-x-seconds|default:60] -offline
    const nameMatch = opts.parameters.match(/-name ([a-zA-Z0-9_]+)/);
    const messagesMatch = opts.parameters.match(/-messages ([0-9]+)/);
    const secondsMatch = opts.parameters.match(/-seconds ([0-9]+)/);
    const tickOffline = !!opts.parameters.match(/-offline/);

    let name = '';
    let messages = 0;
    let seconds = 0;

    if (_.isNil(nameMatch)) {
      return [{ response: translate('timers.name-must-be-defined'), ...opts }];
    } else {
      name = nameMatch[1];
    }

    messages = _.isNil(messagesMatch) ? 0 : parseInt(messagesMatch[1], 10);
    seconds = _.isNil(secondsMatch) ? 60 : parseInt(secondsMatch[1], 10);

    if (messages === 0 && seconds === 0) {
      return [{ response: translate('timers.cannot-set-messages-and-seconds-0'), ...opts }];
    }
    const timer = await Timer.findOne({
      relations: ['messages'],
      where:     { name },
    }) || new Timer();

    timer.tickOffline = tickOffline;
    timer.name =                 name;
    timer.triggerEveryMessage =  messages;
    timer.triggerEverySecond =   seconds;
    timer.isEnabled =            true;
    timer.triggeredAtMessages =  linesParsed;
    timer.triggeredAtTimestamp = new Date().toISOString();
    await timer.save();

    return [{
      response: translate(tickOffline ? 'timers.timer-was-set-with-offline-flag' : 'timers.timer-was-set')
        .replace(/\$name/g, name)
        .replace(/\$messages/g, messages)
        .replace(/\$seconds/g, seconds), ...opts,
    }];
  }

  @command('!timers unset')
  @default_permission(defaultPermissions.CASTERS)
  async unset (opts: CommandOptions): Promise<CommandResponse[]> {
    // -name [name-of-timer]
    const nameMatch = opts.parameters.match(/-name ([\S]+)/);
    let name = '';
    if (_.isNil(nameMatch)) {
      return [{ response: translate('timers.name-must-be-defined'), ...opts }];
    } else {
      name = nameMatch[1];
    }

    const timer = await Timer.findOneBy({ name: name });
    if (!timer) {
      return [{ response: translate('timers.timer-not-found').replace(/\$name/g, name), ...opts }];
    }

    await Timer.remove(timer);
    return [{ response: translate('timers.timer-deleted').replace(/\$name/g, name), ...opts }];
  }

  @command('!timers rm')
  @default_permission(defaultPermissions.CASTERS)
  async rm (opts: CommandOptions): Promise<CommandResponse[]> {
    // -id [id-of-response]
    try {
      const id = new Expects(opts.parameters).argument({ type: 'uuid', name: 'id' }).toArray()[0];
      await TimerResponse.delete({ id });
      return [{
        response: translate('timers.response-deleted')
          .replace(/\$id/g, id), ...opts,
      }];
    } catch (e: any) {
      return [{ response: translate('timers.id-must-be-defined'), ...opts }];
    }
  }

  @command('!timers add')
  @default_permission(defaultPermissions.CASTERS)
  async add (opts: CommandOptions): Promise<CommandResponse[]> {
    // -name [name-of-timer] -response '[response]'
    const nameMatch = opts.parameters.match(/-name ([\S]+)/);
    const responseMatch = opts.parameters.match(/-response ['"](.+)['"]/);
    let name = '';
    let response = '';
    if (_.isNil(nameMatch)) {
      return [{ response: translate('timers.name-must-be-defined'), ...opts }];
    } else {
      name = nameMatch[1];
    }

    if (_.isNil(responseMatch)) {
      return [{ response: translate('timers.response-must-be-defined'), ...opts }];
    } else {
      response = responseMatch[1];
    }
    const timer = await Timer.findOne({
      relations: ['messages'],
      where:     { name },
    });
    if (!timer) {
      return [{
        response: translate('timers.timer-not-found')
          .replace(/\$name/g, name), ...opts,
      }];
    }

    const item = new TimerResponse();
    item.isEnabled = true;
    item.timestamp = new Date().toISOString();
    item.response =  response;
    item.timer =     timer;
    await item.save();

    return [{
      response: translate('timers.response-was-added')
        .replace(/\$id/g, item.id)
        .replace(/\$name/g, name)
        .replace(/\$response/g, response), ...opts,
    }];
  }

  @command('!timers list')
  @default_permission(defaultPermissions.CASTERS)
  async list (opts: CommandOptions): Promise<CommandResponse[]> {
    // !timers list -name [name-of-timer]
    const nameMatch = opts.parameters.match(/-name ([\S]+)/);
    let name = '';

    if (_.isNil(nameMatch)) {
      const timers = await Timer.find();
      return [{ response: translate('timers.timers-list').replace(/\$list/g, _.orderBy(timers, 'name').map((o) => (o.isEnabled ? '⚫' : '⚪') + ' ' + o.name).join(', ')), ...opts }];
    } else {
      name = nameMatch[1];
    }

    const timer = await Timer.findOne({
      relations: ['messages'],
      where:     { name },
    });
    if (!timer) {
      return [{
        response: translate('timers.timer-not-found')
          .replace(/\$name/g, name), ...opts,
      }];
    }
    const responses: CommandResponse[] = [];
    responses.push({ response: translate('timers.responses-list').replace(/\$name/g, name), ...opts });
    for (const response of sortBy(timer.messages, 'response')) {
      responses.push({ response: (response.isEnabled ? '⚫ ' : '⚪ ') + `${response.id} - ${response.response}`, ...opts });
    }
    return responses;
  }

  @command('!timers toggle')
  @default_permission(defaultPermissions.CASTERS)
  async toggle (opts: CommandOptions): Promise<CommandResponse[]> {
    // -name [name-of-timer] or -id [id-of-response]
    const [id, name] = new Expects(opts.parameters)
      .argument({
        type: 'uuid', name: 'id', optional: true,
      })
      .argument({
        type: String, name: 'name', optional: true,
      })
      .toArray();

    if ((_.isNil(id) && _.isNil(name)) || (!_.isNil(id) && !_.isNil(name))) {
      return [{ response: translate('timers.id-or-name-must-be-defined'), ...opts }];
    }

    if (!_.isNil(id)) {
      const response = await TimerResponse.findOneBy({ id });
      if (!response) {
        return [{ response: translate('timers.response-not-found').replace(/\$id/g, id), ...opts }];
      }

      response.isEnabled = !response.isEnabled;
      await response.save();

      return [{
        response: translate(response.isEnabled ? 'timers.response-enabled' : 'timers.response-disabled')
          .replace(/\$id/g, id), ...opts,
      }];
    }

    if (!_.isNil(name)) {
      const timer = await Timer.findOneBy({ name: name });
      if (!timer) {
        return [{ response: translate('timers.timer-not-found').replace(/\$name/g, name), ...opts }];
      }

      timer.isEnabled = !timer.isEnabled;
      await timer.save();

      return [{
        response: translate(timer.isEnabled ? 'timers.timer-enabled' : 'timers.timer-disabled')
          .replace(/\$name/g, name), ...opts,
      }];
    }
    return [];
  }
}

export default new Timers();
