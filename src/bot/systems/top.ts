import _ from 'lodash';
import moment from 'moment-timezone';

import { getIgnoreList, getLocalizedName, isIgnored, sendMessage } from '../commons';
import { command, default_permission } from '../decorators';
import { permission } from '../permissions';
import System from './_interface';
import { debug } from '../helpers/log';
import { getRepository } from 'typeorm';
import { User } from '../entity/user';

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
  public time(opts) {
    opts.parameters = TYPE.TIME;
    this.showTop(opts);
  }

  @command('!top tips')
  @default_permission(permission.CASTERS)
  public tips(opts) {
    opts.parameters = TYPE.TIPS;
    this.showTop(opts);
  }

  @command('!top points')
  @default_permission(permission.CASTERS)
  public points(opts) {
    opts.parameters = TYPE.POINTS;
    this.showTop(opts);
  }

  @command('!top messages')
  @default_permission(permission.CASTERS)
  public messages(opts) {
    opts.parameters = TYPE.MESSAGES;
    this.showTop(opts);
  }

  @command('!top followage')
  @default_permission(permission.CASTERS)
  public followage(opts) {
    opts.parameters = TYPE.FOLLOWAGE;
    this.showTop(opts);
  }

  @command('!top subage')
  @default_permission(permission.CASTERS)
  public subage(opts) {
    opts.parameters = TYPE.SUBAGE;
    this.showTop(opts);
  }

  @command('!top submonths')
  @default_permission(permission.CASTERS)
  public submonths(opts) {
    opts.parameters = TYPE.SUBMONTHS;
    this.showTop(opts);
  }

  @command('!top bits')
  @default_permission(permission.CASTERS)
  public bits(opts) {
    opts.parameters = TYPE.BITS;
    this.showTop(opts);
  }

  @command('!top gifts')
  @default_permission(permission.CASTERS)
  public gifts(opts) {
    opts.parameters = TYPE.GIFTS;
    this.showTop(opts);
  }

  private async showTop(opts) {
    let sorted: {username: string; value: number}[] = [];
    let message;
    let i = 0;
    const type = opts.parameters;

    // count ignored users
    const _total = 10 + getIgnoreList().length;

    moment.locale(global.lib.translate.lang);

    switch (type) {
      case TYPE.TIME:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.watchedTime', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.watchedTime };
            });
        message = global.translate('systems.top.time').replace(/\$amount/g, 10);
        break;
      case TYPE.TIPS:
        sorted
          = (await getRepository(User)
            .query(`SELECT "user"."userId", "user"."username", SUM("user_tip"."sortAmount") as value FROM "user" INNER JOIN "user_tip" ON "user"."userId" = "user_tip"."userUserId" WHERE "user"."username" != '${global.oauth.botUsername.toLowerCase()}' AND "user"."username" != '${global.oauth.broadcasterUsername.toLowerCase()}' GROUP BY "user"."userId" ORDER BY value DESC LIMIT ${_total}; `)
          ).filter(o => !isIgnored({ username: o.username, userId: o.userId }));
        message = global.translate('systems.top.tips').replace(/\$amount/g, 10);
        break;
      case TYPE.POINTS:
        if (!global.systems.points.enabled) {
          return;
        }
        sorted
         = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.points', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.points };
            });
        message = global.translate('systems.top.points').replace(/\$amount/g, 10);
        break;
      case TYPE.MESSAGES:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.messages', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.messages };
            });
        message = global.translate('systems.top.messages').replace(/\$amount/g, 10);
        break;
      case TYPE.FOLLOWAGE:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .andWhere('user.isFollower = :isFollower', { isFollower: true })
            .orderBy('user.followedAt', 'ASC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.followedAt };
            });
        message = global.translate('systems.top.followage').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBAGE:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
            .orderBy('user.subscribedAt', 'ASC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.subscribedAt };
            });
        message = global.translate('systems.top.subage').replace(/\$amount/g, 10);
        break;
      case TYPE.BITS:
        sorted
        = (await getRepository(User)
            .query(`SELECT "user"."userId", "user"."username", SUM("user_bit"."amount") as value FROM "user" INNER JOIN user_bit ON "user"."userId" = "user_bit"."userUserId" WHERE "user"."username" != '${global.oauth.botUsername.toLowerCase()}' AND "user"."username" != '${global.oauth.broadcasterUsername.toLowerCase()}' GROUP BY "user"."userId" ORDER BY value DESC LIMIT ${_total}; `)
          ).filter(o => !isIgnored({ username: o.username, userId: o.userId }));
        message = global.translate('systems.top.bits').replace(/\$amount/g, 10);
        break;
      case TYPE.GIFTS:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.giftedSubscribes', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.giftedSubscribes };
            });
        message = global.translate('systems.top.gifts').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBMONTHS:
        sorted
          = (await getRepository(User).createQueryBuilder('user')
            .where('user.username != :botusername', { botusername: global.oauth.botUsername.toLowerCase() })
            .andWhere('user.username != :broadcasterusername', { broadcasterusername: global.oauth.broadcasterUsername.toLowerCase() })
            .orderBy('user.subscribeCumulativeMonths', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ username: o.username, userId: o.userId }))
            .map(o => {
              return { username: o.username, value: o.subscribeCumulativeMonths };
            });
        message = global.translate('systems.top.submonths').replace(/\$amount/g, 10);
        break;
    }

    if (sorted.length > 0) {
      // remove ignored users
      sorted = _.chunk(sorted, 10)[0];

      for (const user of sorted) {
        message += (i + 1) + '. ' + (global.tmi.showWithAt ? '@' : '') + (user.username || 'unknown') + ' - ';
        switch (type) {
          case TYPE.TIME:
            message += (user.value / 1000 / 60 / 60).toFixed(1) + 'h';
            break;
          case TYPE.SUBMONTHS:
            message += [user.value, getLocalizedName(user.value, 'core.months')].join(' ');
            break;
          case TYPE.TIPS:
            message += Number(user.value).toFixed(2) + global.currency.symbol(global.currency.mainCurrency);
            break;
          case TYPE.POINTS:
            message += user.value + ' ' + await global.systems.points.getPointsName(user.value);
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
    sendMessage(message, opts.sender, opts.attr);
  }
}

export default Top;
export { Top };
