'use strict';

import * as _ from 'lodash';

// bot libraries
import * as Parser from '../parser';
import System from './_interface';
import constants from '../constants';
import { permission } from '../permissions';
import { command, default_permission, rollback } from '../decorators';
import { parser } from '../decorators';
import { sendMessage, prepare, isOwner } from '../commons';

/*
 * !price                     - gets an info about price usage
 * !price set [cmd] [price]   - add notice with specified response
 * !price unset [cmd] [price] - add notice with specified response
 * !price list                - get list of notices
 * !price toggle [cmd]        - remove notice by id
 */

class Price extends System {
  public dependsOn: string[] = ['systems.points'];

  constructor () {
    super();

    this.addMenu({ category: 'manage', name: 'price', id: 'price/list' });
  }

  @command('!price')
  @default_permission(permission.CASTERS)
  main (opts) {
    sendMessage(global.translate('core.usage') + ': !price set <cmd> <price> | !price unset <cmd> | !price list | !price toggle <cmd>', opts.sender, opts.attr);
  }

  @command('!price set')
  @default_permission(permission.CASTERS)
  async set (opts) {
    const parsed = opts.parameters.match(/^(![\S]+) ([0-9]+)$/);

    if (_.isNil(parsed)) {
      let message = await prepare('price.price-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const [command, price] = parsed.slice(1);
    if (parseInt(price, 10) === 0) {
      this.unset(opts);
      return false;
    }

    await global.db.engine.update(this.collection.data, { command: command }, { command: command, price: parseInt(price, 10), enabled: true });
    let message = await prepare('price.price-was-set', { command, amount: parseInt(price, 10), pointsName: await global.systems.points.getPointsName(price) });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!price unset')
  @default_permission(permission.CASTERS)
  async unset (opts) {
    const parsed = opts.parameters.match(/^(![\S]+)$/);

    if (_.isNil(parsed)) {
      let message = await prepare('price.price-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const command = parsed[1];
    await global.db.engine.remove(this.collection.data, { command: command });
    let message = await prepare('price.price-was-unset', { command });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!price toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts) {
    const parsed = opts.parameters.match(/^(![\S]+)$/);

    if (_.isNil(parsed)) {
      let message = await prepare('price.price-parse-failed');
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    const command = parsed[1];
    const price = await global.db.engine.findOne(this.collection.data, { command: command });
    if (_.isEmpty(price)) {
      let message = await prepare('price.price-was-not-found', { command });
      sendMessage(message, opts.sender, opts.attr);
      return false;
    }

    await global.db.engine.update(this.collection.data, { command: command }, { enabled: !price.enabled });
    let message = await prepare(!price.enabled ? 'price.price-was-enabled' : 'price.price-was-disabled', { command });
    sendMessage(message, opts.sender, opts.attr);
  }

  @command('!price list')
  @default_permission(permission.CASTERS)
  async list (opts) {
    let prices = await global.db.engine.find(this.collection.data);
    var output = (prices.length === 0 ? global.translate('price.list-is-empty') : global.translate('price.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(prices, 'command'), (o) => { return `${o.command} - ${o.price}`; })).join(', ')));
    sendMessage(output, opts.sender, opts.attr);
  }

  @parser({ priority: constants.HIGH })
  async check (opts) {
    const parsed = opts.message.match(/^(![\S]+)/);
    const helpers = (await (new Parser.default()).getCommandsList()).filter(o => o.isHelper).map(o => o.command);
    if (
      _.isNil(parsed) ||
      isOwner(opts.sender) ||
      helpers.includes(opts.message)
    ) {return true;}
    const price = await global.db.engine.findOne(this.collection.data, { command: parsed[1], enabled: true });

    if (_.isEmpty(price)) { // no price set
      return true;
    }
    var availablePts = await global.systems.points.getPointsOf(opts.sender.userId);
    var removePts = parseInt(price.price, 10);
    let haveEnoughPoints = availablePts >= removePts;
    if (!haveEnoughPoints) {
      let message = await prepare('price.user-have-not-enough-points', { amount: removePts, command: `${price.command}`, pointsName: await global.systems.points.getPointsName(removePts) });
      sendMessage(message, opts.sender, opts.attr);
    } else {
      await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: (removePts * -1) });
    }
    return haveEnoughPoints;
  }

  @rollback()
  async restorePointsRollback (opts) {
    const parsed = opts.message.match(/^(![\S]+)/);
    const helpers = (await (new Parser.default()).getCommandsList()).filter(o => o.isHelper).map(o => o.command);
    if (
      _.isNil(parsed) ||
      isOwner(opts.sender) ||
      helpers.includes(opts.message)
    ) {return true;}
    const price = await global.db.engine.findOne(this.collection.data, { command: parsed[1], enabled: true });

    if (_.isEmpty(price)) { // no price set
      return true;
    }

    const removePts = parseInt(price.price, 10);
    await global.db.engine.increment('users.points', { id: opts.sender.userId }, { points: removePts });
  }
}

export default Price;
export { Price };