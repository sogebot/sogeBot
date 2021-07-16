import _ from 'lodash';
import { getRepository, LessThan } from 'typeorm';

import { Permissions, PermissionsInterface } from '../../database/entity/permissions';
import { User } from '../../database/entity/user';
import { areDecoratorsLoaded } from '../../decorators';
import { getBroadcaster } from '../getBroadcaster';
import {
  debug, error, warning,
} from '../log';
import { generalOwners } from '../oauth/generalOwners';
import {
  isFollower, isOwner, isSubscriber, isVIP,
} from '../user';
import { isBot } from '../user/isBot';
import { isBroadcaster } from '../user/isBroadcaster';
import { isModerator } from '../user/isModerator';
import { defaultPermissions } from './defaultPermissions';
import { filters } from './filters';

let isWarnedAboutCasters = false;

async function check(userId: string, permId: string, partial = false): Promise<{access: boolean; permission: PermissionsInterface | undefined}> {
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

  if (generalOwners.value.filter(o => typeof o === 'string' && o.trim().length > 0).length === 0 && getBroadcaster() === '' && !isWarnedAboutCasters) {
    isWarnedAboutCasters = true;
    warning('Owners or broadcaster oauth is not set, all users are treated as CASTERS!!!');
    const pItem = await getRepository(Permissions).findOne({ id: defaultPermissions.CASTERS });
    return { access: true, permission: pItem };
  }

  const user = await getRepository(User).findOne({ where: { userId } });
  const pItem = (await getRepository(Permissions).findOne({
    relations: ['filters'],
    where:     { id: permId },
  })) as PermissionsInterface;
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
      const partialPermission = await getRepository(Permissions).find({ where: { order: LessThan(pItem.order) } });
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
        if (generalOwners.value.filter(o => typeof o === 'string').length === 0 && getBroadcaster() === '') {
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
      case 'followers':
        shouldProceed = isFollower(user);
        break;
      default:
        shouldProceed = false; // we don't have any automation
        break;
    }
    debug('permissions.check', JSON.stringify({ access: shouldProceed && filters(user, pItem.filters), permission: pItem }));
    return { access: shouldProceed && await filters(user, pItem.filters), permission: pItem };
  } catch (e) {
    error(e.stack);
    return { access: false, permission: pItem };
  }
}

export { check };