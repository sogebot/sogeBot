'use strict';

import * as _ from 'lodash';

// bot libraries
import Parser from '../parser';
import System from './_interface';
import * as constants from '../constants';
import { permission } from '../helpers/permissions';
import { command, default_permission, rollback } from '../decorators';
import { parser } from '../decorators';
import { isOwner, parserReply, prepare } from '../commons';

import { getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import { Price as PriceEntity, PriceInterface } from '../database/entity/price';
import { adminEndpoint } from '../helpers/socket';
import { error } from '../helpers/log';
import { translate } from '../translate';
import points from './points';

/*
 * !price                     - gets an info about price usage
 * !price set [cmd] [price]   - add notice with specified response
 * !price unset [cmd] [price] - add notice with specified response
 * !price list                - get list of notices
 * !price toggle [cmd]        - remove notice by id
 */

class Price extends System {
  public dependsOn = [ points ];

  constructor () {
    super();
    this.addMenu({ category: 'manage', name: 'price', id: 'manage/price/list' });
  }

  sockets() {
    adminEndpoint(this.nsp, 'price::getAll', async (cb) => {
      cb(await getRepository(PriceEntity).find({
        order: {
          price: 'ASC',
        },
      }));
    });

    adminEndpoint(this.nsp, 'price::getOne', async (id, cb) => {
      cb(await getRepository(PriceEntity).findOne({ id }));
    });

    adminEndpoint(this.nsp, 'price::save', async (price: PriceInterface, cb) => {
      try {
        await getRepository(PriceEntity).save(price);
        cb(null);
      } catch (e) {
        error(e);
        cb(e.stack);
      }
    });

    adminEndpoint(this.nsp, 'price::delete', async (id: string, cb) => {
      try {
        await getRepository(PriceEntity).delete({ id });
        cb(null);
      } catch (e) {
        error(e);
        cb(e.stack);
      }
    });
  }

  @command('!price')
  @default_permission(permission.CASTERS)
  main (opts: CommandOptions): CommandResponse[] {
    return [{ response: translate('core.usage') + ': !price set <cmd> <price> | !price unset <cmd> | !price list | !price toggle <cmd>', ...opts }];
  }

  @command('!price set')
  @default_permission(permission.CASTERS)
  async set (opts: CommandOptions): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(![\S]+) ([0-9]+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('price.price-parse-failed');
      return [{ response, ...opts }];
    }

    const [cmd, argPrice] = parsed.slice(1);
    if (parseInt(argPrice, 10) === 0) {
      return this.unset(opts);
    }

    const price = await getRepository(PriceEntity).save({
      ...(await getRepository(PriceEntity).findOne({ command: cmd })),
      command: cmd, price: parseInt(argPrice, 10),
    });
    const response = prepare('price.price-was-set', { command: cmd, amount: parseInt(argPrice, 10), pointsName: await points.getPointsName(price) });
    return [{ response, ...opts }];
  }

  @command('!price unset')
  @default_permission(permission.CASTERS)
  async unset (opts: CommandOptions): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(![\S]+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('price.price-parse-failed');
      return [{ response, ...opts }];
    }

    const cmd = parsed[1];
    await getRepository(PriceEntity).delete({ command: cmd });
    const response = prepare('price.price-was-unset', { command: cmd });
    return [{ response, ...opts }];
  }

  @command('!price toggle')
  @default_permission(permission.CASTERS)
  async toggle (opts: CommandOptions): Promise<CommandResponse[]> {
    const parsed = opts.parameters.match(/^(![\S]+)$/);

    if (_.isNil(parsed)) {
      const response = prepare('price.price-parse-failed');
      return [{ response, ...opts }];
    }

    const cmd = parsed[1];
    const price = await getRepository(PriceEntity).findOne({ command: cmd });
    if (!price) {
      const response = prepare('price.price-was-not-found', { command: cmd });
      return [{ response, ...opts }];
    }

    await getRepository(PriceEntity).save({...price, enabled: !price.enabled});
    const response = prepare(price.enabled ? 'price.price-was-enabled' : 'price.price-was-disabled', { command: cmd });
    return [{ response, ...opts }];
  }

  @command('!price list')
  @default_permission(permission.CASTERS)
  async list (opts: CommandOptions): Promise<CommandResponse[]> {
    const prices = await getRepository(PriceEntity).find();
    const response = (prices.length === 0 ? translate('price.list-is-empty') : translate('price.list-is-not-empty').replace(/\$list/g, (_.map(_.orderBy(prices, 'command'), (o) => {
      return `${o.command} - ${o.price}`;
    })).join(', ')));
    return [{ response, ...opts }];
  }

  @parser({ priority: constants.MEDIUM })
  async check (opts: ParserOptions): Promise<boolean> {
    const parsed = opts.message.match(/^(![\S]+)/);
    if (!parsed || isOwner(opts.sender)) {
      return true; // skip if not command or user is owner
    }
    const helpers = (await (new Parser()).getCommandsList()).filter(o => o.isHelper).map(o => o.command);
    if (helpers.includes(opts.message)) {
      return true;
    }

    const price = await getRepository(PriceEntity).findOne({ command: parsed[1], enabled: true });
    if (!price) { // no price set
      return true;
    }
    const availablePts = await points.getPointsOf(opts.sender.userId);
    const removePts = price.price;
    const haveEnoughPoints = availablePts >= removePts;
    if (!haveEnoughPoints) {
      const response = prepare('price.user-have-not-enough-points', { amount: removePts, command: `${price.command}`, pointsName: await points.getPointsName(removePts) });
      parserReply(response, opts);
    } else {
      await points.decrement({ userId: opts.sender.userId }, removePts);
    }
    return haveEnoughPoints;
  }

  @rollback()
  async restorePointsRollback (opts: ParserOptions): Promise<boolean> {
    const parsed = opts.message.match(/^(![\S]+)/);
    const helpers = (await (new Parser()).getCommandsList()).filter(o => o.isHelper).map(o => o.command);
    if (
      _.isNil(parsed)
      || isOwner(opts.sender)
      || helpers.includes(opts.message)
    ) {
      return true;
    }
    const price = await getRepository(PriceEntity).findOne({ command: parsed[1], enabled: true });
    if (price) { // no price set
      const removePts = price.price;
      await getRepository(User).increment({ userId: opts.sender.userId }, 'points', removePts);
    }
    return true;
  }
}

export default new Price();