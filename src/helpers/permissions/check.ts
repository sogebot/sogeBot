import { Permissions } from '@entity/permissions.js';
import _ from 'lodash-es';
import { LessThan } from 'typeorm';

import { defaultPermissions } from './defaultPermissions.js';
import { areDecoratorsLoaded } from '../../decorators.js';
import {
  debug, error, warning,
} from '../log.js';
import * as changelog from '../user/changelog.js';
import {
  isOwner, isSubscriber, isVIP,
} from '../user/index.js';
import { isBot } from '../user/isBot.js';
import { isBroadcaster } from '../user/isBroadcaster.js';
import { isModerator } from '../user/isModerator.js';

import type { checkReturnType } from '~/../d.ts/src/helpers/permissions/check.js';
import { filters } from '~/helpers/permissions/filters.js';
import { variables } from '~/watchers.js';

let isWarnedAboutCasters = false;

async function check(userId: string, permId: string, partial = false): Promise<checkReturnType> {
  if (!areDecoratorsLoaded) {
    await new Promise<void>((resolve) => {
      const _check = () => {
        // wait for all data to be loaded
        if (areDecoratorsLoaded) {
          resolve();
        } else {
          setTimeout(() => _check(), 10);
        }
      };
      _check();
    });
  }

  const broadcasterUsername = variables.get('services.twitch.broadcasterUsername') as string;
  const generalOwners = variables.get('services.twitch.generalOwners') as string[];

  if (generalOwners.filter(o => typeof o === 'string' && o.trim().length > 0).length === 0 && broadcasterUsername === '' && !isWarnedAboutCasters) {
    isWarnedAboutCasters = true;
    warning('Owners or broadcaster oauth is not set, all users are treated as CASTERS!!!');
    const pItem = await Permissions.findOneBy({ id: defaultPermissions.CASTERS });
    return { access: true, permission: pItem };
  }

  const user = await changelog.get(userId);
  const pItem = await Permissions.findOne({
    where: { id: permId },
  });
  try {
    if (!user) {
      return { access: permId === defaultPermissions.VIEWERS, permission: pItem };
    }
    if (!pItem) {
      throw Error(`Permissions ${permId} doesn't exist`);
    }

    // if userId is part of excludeUserIds => false
    if (pItem.excludeUserIds.includes(String(userId))) {
      return { access: false, permission: pItem };
    }

    // if userId is part of userIds => true
    if (pItem.userIds.includes(String(userId))) {
      return { access: true, permission: pItem };
    }

    // get all higher permissions to check if not partial check only
    if (!partial && pItem.isWaterfallAllowed) {
      const partialPermission = await Permissions.find({ where: { order: LessThan(pItem.order) } });
      for (const p of _.orderBy(partialPermission, 'order', 'asc')) {
        const partialCheck = await check(userId, p.id, true);
        if (partialCheck.access) {
          return { access: true, permission: p }; // we don't need to continue, user have already access with higher permission
        }
      }
    }

    let shouldProceed = false;
    switch (pItem.automation) {
      case 'viewers':
        shouldProceed = true;
        break;
      case 'casters':
        if (generalOwners.filter(o => typeof o === 'string').length === 0 && broadcasterUsername === '') {
          shouldProceed = true;
        } else {
          shouldProceed = isBot(user) || isBroadcaster(user) || isOwner(user);
        }
        break;
      case 'moderators':
        shouldProceed = isModerator(user);
        break;
      case 'subscribers':
        shouldProceed = isSubscriber(user);
        break;
      case 'vip':
        shouldProceed = isVIP(user);
        break;
      default:
        shouldProceed = false; // we don't have any automation
        break;
    }
    const access = shouldProceed && await filters(user, pItem.filters);
    debug('permissions.check', JSON.stringify({ userId, access, permission: pItem }));
    return { access, permission: pItem };
  } catch (e: any) {
    error(e.stack);
    return { access: false, permission: pItem };
  }
}

export { check };