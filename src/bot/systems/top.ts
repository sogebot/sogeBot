import _ from 'lodash';
import moment from 'moment-timezone';

import { getIgnoreList, getLocalizedName, isIgnored } from '../commons';
import { command, default_permission } from '../decorators';
import { permission } from '../helpers/permissions';
import System from './_interface';
import { debug } from '../helpers/log';
import { getConnection, getRepository } from 'typeorm';
import { User } from '../database/entity/user';
import translateLib, { translate } from '../translate';
import oauth from '../oauth';
import points from './points';
import tmi from '../tmi';
import currency from '../currency';

enum TYPE {
  TIME,
  TIPS,
  POINTS,
  MESSAGES,
  FOLLOWAGE,
  SUBAGE,
  BITS,
  GIFTS,
  SUBMONTHS,
}

/*
 * !top time
 * !top tips
 * !top points
 * !top messages
 * !top followage
 * !top subage
 * !top submonths
 * !top bits
 * !top gifts
 */

class Top extends System {
  @command('!top time')
  @default_permission(permission.CASTERS)
  async time(opts) {
    opts.parameters = TYPE.TIME;
    return this.showTop(opts);
  }

  @command('!top tips')
  @default_permission(permission.CASTERS)
  async tips(opts) {
    opts.parameters = TYPE.TIPS;
    return this.showTop(opts);
  }

  @command('!top points')
  @default_permission(permission.CASTERS)
  async points(opts) {
    opts.parameters = TYPE.POINTS;
    return this.showTop(opts);
  }

  @command('!top messages')
  @default_permission(permission.CASTERS)
  async messages(opts) {
    opts.parameters = TYPE.MESSAGES;
    return this.showTop(opts);
  }

  @command('!top followage')
  @default_permission(permission.CASTERS)
  async followage(opts) {
    opts.parameters = TYPE.FOLLOWAGE;
    return this.showTop(opts);
  }

  @command('!top subage')
  @default_permission(permission.CASTERS)
  async subage(opts) {
    opts.parameters = TYPE.SUBAGE;
    return this.showTop(opts);
  }

  @command('!top submonths')
  @default_permission(permission.CASTERS)
  async submonths(opts) {
    opts.parameters = TYPE.SUBMONTHS;
    return this.showTop(opts);
  }

  @command('!top bits')
  @default_permission(permission.CASTERS)
  async bits(opts) {
    opts.parameters = TYPE.BITS;
    return this.showTop(opts);
  }

  @command('!top gifts')
  @default_permission(permission.CASTERS)
  async gifts(opts) {
    opts.parameters = TYPE.GIFTS;
    return this.showTop(opts);
  }

  private async showTop(opts): Promise<CommandResponse[]> {
    let sorted: {username: string; value: number}[] = [];
    let message;
    let i = 0;
    const type = opts.parameters;

    // count ignored users
    const _total = 10 + getIgnoreList().length;

    moment.locale(translateLib.lang);

    const connection = await getConnection();
    switch (type) {
      case TYPE.TIME:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.watchedTime', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.watchedTime };
            });
        message = translate('systems.top.time').replace(/\$amount/g, 10);
        break;
      case TYPE.TIPS:
        const joinTip = connection.options.type === 'postgres' ? '"user_tip"."userUserId" = "user"."userId"' : 'user_tip.userUserId = user.userId';
        sorted
         = (await getRepository(User).createQueryBuilder('user')
            .orderBy('value', 'DESC')
            .addSelect('COALESCE(SUM(user_tip.sortAmount), 0)', 'value')
            .addSelect('user.username')
            .limit(_total)
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .innerJoin('user_tip', 'user_tip', joinTip)
            .groupBy('user.userId')
            .getRawMany()
          ).filter(o => !isIgnored({ username: o.username, userId: o.userId }));
        message = translate('systems.top.tips').replace(/\$amount/g, 10);
        break;
      case TYPE.POINTS:
        if (!points.enabled) {
          return [];
        }
        sorted
         = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.points', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.points };
            });
        message = translate('systems.top.points').replace(/\$amount/g, 10);
        break;
      case TYPE.MESSAGES:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.messages', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.messages };
            });
        message = translate('systems.top.messages').replace(/\$amount/g, 10);
        break;
      case TYPE.FOLLOWAGE:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .andWhere('user.isFollower = :isFollower', { isFollower: true })
            .orderBy('user.followedAt', 'ASC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.followedAt };
            });
        message = translate('systems.top.followage').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBAGE:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
            .orderBy('user.subscribedAt', 'ASC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.subscribedAt };
            });
        message = translate('systems.top.subage').replace(/\$amount/g, 10);
        break;
      case TYPE.BITS:
        const joinBit = connection.options.type === 'postgres' ? '"user_bit"."userUserId" = "user"."userId"' : 'user_bit.userUserId = user.userId';
        sorted
         = (await getRepository(User).createQueryBuilder('user')
            .orderBy('value', 'DESC')
            .addSelect('COALESCE(SUM(user_bit.amount), 0)', 'value')
            .addSelect('user.username')
            .limit(_total)
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .innerJoin('user_bit', 'user_bit', joinBit)
            .groupBy('user.userId')
            .getRawMany()
          ).filter(o => !isIgnored({ username: o.username, userId: o.userId }));
        message = translate('systems.top.bits').replace(/\$amount/g, 10);
        break;
      case TYPE.GIFTS:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.giftedSubscribes', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.giftedSubscribes };
            });
        message = translate('systems.top.gifts').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBMONTHS:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.subscribeCumulativeMonths', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.subscribeCumulativeMonths };
            });
        message = translate('systems.top.submonths').replace(/\$amount/g, 10);
        break;
    }

    if (sorted.length > 0) {
      // remove ignored users
      sorted = _.chunk(sorted, 10)[0];

      for (const user of sorted) {
        message += (i + 1) + '. ' + (tmi.showWithAt ? '@' : '') + (user.username || 'unknown') + ' - ';
        switch (type) {
          case TYPE.TIME:
            message += (user.value / 1000 / 60 / 60).toFixed(1) + 'h';
            break;
          case TYPE.SUBMONTHS:
            message += [user.value, getLocalizedName(user.value, 'core.months')].join(' ');
            break;
          case TYPE.TIPS:
            message += Number(user.value).toFixed(2) + currency.symbol(currency.mainCurrency);
            break;
          case TYPE.POINTS:
            message += user.value + ' ' + await points.getPointsName(user.value);
            break;
          case TYPE.MESSAGES:
          case TYPE.BITS:
          case TYPE.GIFTS:
            message += String(user.value);
            break;
          case TYPE.FOLLOWAGE:
          case TYPE.SUBAGE:
            message += `${moment.utc(user.value).format('L')} (${moment.utc(user.value).fromNow()})`;
            break;
        }
        if (i + 1 < 10 && !_.isNil(sorted[i + 1])) {
          message += ', ';
        }
        i++;
      }
    } else {
      message += 'no data available';
    }
    debug('systems.top', message);
    return [{ response: message, ...opts }];
  }
}

export default new Top();
