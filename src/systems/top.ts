import { User } from '@entity/user.js';
import { dayjs } from '@sogebot/ui-helpers/dayjsHelper.js';
import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';
import { format } from '@sogebot/ui-helpers/number.js';
import _ from 'lodash-es';

import System from './_interface.js';
import levels from './levels.js';
import points from './points.js';
import { command, default_permission } from '../decorators.js';
import general from '../general.js';

import { AppDataSource } from '~/database.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import { debug } from '~/helpers/log.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import { getPointsName } from '~/helpers/points/index.js';
import { unserialize } from '~/helpers/type.js';
import * as changelog from '~/helpers/user/changelog.js';
import { getIgnoreList, isIgnored } from '~/helpers/user/isIgnored.js';
import twitch from '~/services/twitch.js';
import { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

enum TYPE {
  TIME = '0',
  TIPS = '1',
  POINTS = '2',
  MESSAGES = '3',
  SUBAGE = '5',
  BITS = '6',
  GIFTS = '7',
  SUBMONTHS = '8',
  LEVEL = '9',
}

/*
 * !top time
 * !top tips
 * !top points
 * !top messages
 * !top subage
 * !top submonths
 * !top bits
 * !top gifts
 */

class Top extends System {
  @command('!top time')
  @default_permission(defaultPermissions.CASTERS)
  async time(opts: CommandOptions) {
    opts.parameters = TYPE.TIME;
    return this.showTop(opts);
  }

  @command('!top tips')
  @default_permission(defaultPermissions.CASTERS)
  async tips(opts: CommandOptions) {
    opts.parameters = TYPE.TIPS;
    return this.showTop(opts);
  }

  @command('!top points')
  @default_permission(defaultPermissions.CASTERS)
  async points(opts: CommandOptions) {
    opts.parameters = TYPE.POINTS;
    return this.showTop(opts);
  }

  @command('!top messages')
  @default_permission(defaultPermissions.CASTERS)
  async messages(opts: CommandOptions) {
    opts.parameters = TYPE.MESSAGES;
    return this.showTop(opts);
  }

  @command('!top subage')
  @default_permission(defaultPermissions.CASTERS)
  async subage(opts: CommandOptions) {
    opts.parameters = TYPE.SUBAGE;
    return this.showTop(opts);
  }

  @command('!top submonths')
  @default_permission(defaultPermissions.CASTERS)
  async submonths(opts: CommandOptions) {
    opts.parameters = TYPE.SUBMONTHS;
    return this.showTop(opts);
  }

  @command('!top bits')
  @default_permission(defaultPermissions.CASTERS)
  async bits(opts: CommandOptions) {
    opts.parameters = TYPE.BITS;
    return this.showTop(opts);
  }

  @command('!top gifts')
  @default_permission(defaultPermissions.CASTERS)
  async gifts(opts: CommandOptions) {
    opts.parameters = TYPE.GIFTS;
    return this.showTop(opts);
  }

  @command('!top level')
  @default_permission(defaultPermissions.CASTERS)
  async level(opts: CommandOptions) {
    opts.parameters = TYPE.LEVEL;
    return this.showTop(opts);
  }

  private async showTop(opts: CommandOptions): Promise<CommandResponse[]> {
    let sorted: {userName: string; value: string | number}[] = [];
    let message;
    let i = 0;
    const type = opts.parameters;

    // count ignored users
    const _total = 10 + getIgnoreList().length;

    const botUsername = variables.get('services.twitch.botUsername') as string;
    const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;

    await changelog.flush();
    switch (type) {
      case TYPE.LEVEL: {
        let rawSQL = '';
        if (AppDataSource.options.type === 'better-sqlite3') {
          rawSQL = `SELECT JSON_EXTRACT("user"."extra", '$.levels.xp') AS "data", "userId", "userName"
            FROM "user" "user"
            WHERE "user"."userName" IS NOT '${botUsername.toLowerCase()}'
              AND "user"."userName" IS NOT '${broadcasterUsername.toLowerCase()}'
            ORDER BY length(data) DESC, data DESC LIMIT ${_total}`;
        } else if (AppDataSource.options.type === 'postgres') {
          rawSQL = `SELECT "user"."userId", "user"."userName", CAST("data" as text)
            FROM "user", JSON_EXTRACT_PATH("extra"::json, 'levels') AS "data"
            WHERE "user"."userName" != '${botUsername.toLowerCase()}'
              AND "user"."userName" != '${broadcasterUsername.toLowerCase()}'
            ORDER BY length("data"::text) DESC, "data"::text DESC
            LIMIT ${_total}`;
        } else if (AppDataSource.options.type === 'mysql') {
          rawSQL = `SELECT JSON_EXTRACT(\`user\`.\`extra\`, '$.levels.xp') AS \`data\`, \`userId\`, \`userName\`
            FROM \`user\` \`user\`
            WHERE \`user\`.\`userName\` != '${botUsername.toLowerCase()}'
              AND \`user\`.\`userName\` != '${broadcasterUsername.toLowerCase()}'
            ORDER BY length(\`data\`) DESC, data DESC LIMIT ${_total}`;
        }
        const users = (await AppDataSource.query(rawSQL)).filter((o: any) => !isIgnored({ userName: o.userName, userId: o.userId }));

        for (const rawUser of users) {
          const user = await changelog.get(rawUser.userId);
          if (user) {
            const currentXP = unserialize<bigint>(user.extra?.levels?.xp) ?? BigInt(0);
            sorted.push({ userName: user.userName, value: `${levels.getLevelOf(user)} (${currentXP}XP)` });
          }
        }
        message = translate('systems.top.level').replace(/\$amount/g, 10);
        break;
      }
      case TYPE.TIME:
        sorted
          = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .orderBy('user.watchedTime', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ userName: o.userName, userId: o.userId }))
            .map(o => {
              return { userName: o.userName, value: o.watchedTime };
            });
        message = translate('systems.top.time').replace(/\$amount/g, 10);
        break;
      case TYPE.TIPS: {
        const joinTip = AppDataSource.options.type === 'postgres' ? '"user_tip"."userId" = "user"."userId"' : 'user_tip.userId = user.userId';
        sorted
         = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .orderBy('value', 'DESC')
            .addSelect('COALESCE(SUM(user_tip.sortAmount), 0)', 'value')
            .addSelect('user.userName')
            .limit(_total)
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .innerJoin('user_tip', 'user_tip', joinTip)
            .groupBy('user.userId')
            .getRawMany()
          ).filter(o => !isIgnored({ userName: o.userName, userId: o.userId }));
        message = translate('systems.top.tips').replace(/\$amount/g, 10);
        break;
      }
      case TYPE.POINTS:
        if (!points.enabled) {
          return [];
        }
        sorted
         = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .orderBy('user.points', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ userName: o.userName, userId: o.userId }))
            .map(o => {
              return { userName: o.userName, value: o.points };
            });
        message = translate('systems.top.points').replace(/\$amount/g, 10);
        break;
      case TYPE.MESSAGES:
        sorted
          = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .orderBy('user.messages', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ userName: o.userName, userId: o.userId }))
            .map(o => {
              return { userName: o.userName, value: o.messages };
            });
        message = translate('systems.top.messages').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBAGE:
        sorted
          = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .andWhere('user.isSubscriber = :isSubscriber', { isSubscriber: true })
            .andWhere('user.subscribedAt IS NOT NULL')
            .orderBy('user.subscribedAt', 'ASC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ userName: o.userName, userId: o.userId }))
            .map(o => {
              return { userName: o.userName, value: o.subscribedAt as string };
            });
        message = translate('systems.top.subage').replace(/\$amount/g, 10);
        break;
      case TYPE.BITS: {
        const joinBit = AppDataSource.options.type === 'postgres' ? '"user_bit"."userId" = "user"."userId"' : 'user_bit.userId = user.userId';
        sorted
         = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .orderBy('value', 'DESC')
            .addSelect('COALESCE(SUM(user_bit.amount), 0)', 'value')
            .addSelect('user.userName')
            .limit(_total)
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .innerJoin('user_bit', 'user_bit', joinBit)
            .groupBy('user.userId')
            .getRawMany()
          ).filter(o => !isIgnored({ userName: o.userName, userId: o.userId }));
        message = translate('systems.top.bits').replace(/\$amount/g, 10);
        break;
      }
      case TYPE.GIFTS:
        sorted
          = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .orderBy('user.giftedSubscribes', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ userName: o.userName, userId: o.userId }))
            .map(o => {
              return { userName: o.userName, value: o.giftedSubscribes };
            });
        message = translate('systems.top.gifts').replace(/\$amount/g, 10);
        break;
      case TYPE.SUBMONTHS:
        sorted
          = (await AppDataSource.getRepository(User).createQueryBuilder('user')
            .where('user.userName != :botusername', { botusername: botUsername.toLowerCase() })
            .andWhere('user.userName != :broadcasterusername', { broadcasterusername: broadcasterUsername.toLowerCase() })
            .orderBy('user.subscribeCumulativeMonths', 'DESC')
            .limit(_total)
            .getMany())
            .filter(o => !isIgnored({ userName: o.userName, userId: o.userId }))
            .map(o => {
              return { userName: o.userName, value: o.subscribeCumulativeMonths };
            });
        message = translate('systems.top.submonths').replace(/\$amount/g, 10);
        break;
    }

    if (sorted.length > 0) {
      // remove ignored users
      sorted = _.chunk(sorted, 10)[0];

      for (const user of sorted) {
        message += (i + 1) + '. ' + (twitch.showWithAt ? '@' : '') + (user.userName || 'unknown') + ' - ';
        switch (type) {
          case TYPE.TIME:
            message += Intl.NumberFormat(general.lang, {
              style: 'unit', unit: 'hour', minimumFractionDigits: 1, maximumFractionDigits: 1,
            }).format(Number(user.value) / 1000 / 60 / 60);
            break;
          case TYPE.SUBMONTHS:
            message += [user.value, getLocalizedName(user.value, translate('core.months'))].join(' ');
            break;
          case TYPE.TIPS:
            message += Intl.NumberFormat(general.lang, { style: 'currency', currency: mainCurrency.value }).format(Number(user.value));
            break;
          case TYPE.POINTS:
            message += format(general.numberFormat, 0)(Number(user.value)) + ' ' + getPointsName(Number(user.value));
            break;
          case TYPE.MESSAGES:
          case TYPE.BITS:
          case TYPE.GIFTS:
          case TYPE.LEVEL:
            message += String(user.value);
            break;
          case TYPE.SUBAGE:
            message += `${dayjs.utc(user.value).format('L')} (${dayjs.utc(user.value).fromNow()})`;
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
