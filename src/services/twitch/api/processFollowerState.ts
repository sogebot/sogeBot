import * as constants from '@sogebot/ui-helpers/constants';
import { chunk } from 'lodash';
import { getRepository } from 'typeorm';

import { User, UserInterface } from '~/database/entity/user';
import { follow } from '~/helpers/events/follow';
import { debug } from '~/helpers/log';
import { SQLVariableLimit } from '~/helpers/sql';
import * as changelog from '~/helpers/user/changelog';

export const processFollowerState = async (users: { from_name: string; from_id: string; followed_at: string }[]) => {
  const timer = Date.now();
  if (users.length === 0) {
    debug('api.followers', `No followers to process.`);
    return;
  }
  debug('api.followers', `Processing ${users.length} followers`);
  await changelog.flush();
  const usersGotFromDb = (await Promise.all(
    chunk(users, SQLVariableLimit).map(async (bulk) => {
      return await getRepository(User).findByIds(bulk.map(user => user.from_id));
    }),
  )).flat();
  debug('api.followers', `Found ${usersGotFromDb.length} followers in database`);
  if (users.length > usersGotFromDb.length) {
    const usersSavedToDbPromise: Promise<Readonly<Required<UserInterface>>>[] = [];
    const usersSavedToDb = [];
    users
      .filter(user => !usersGotFromDb.find(db => db.userId === user.from_id))
      .map(user => {
        return { userId: user.from_id, userName: user.from_name };
      }).forEach(user => {
        changelog.update(user.userId, user);
        usersSavedToDbPromise.push(changelog.get(user.userId) as Promise<Readonly<Required<UserInterface>>>);
      });
    usersSavedToDb.push(...await Promise.all(usersSavedToDbPromise));
    debug('api.followers', `Processed ${usersSavedToDb.length} followers`);
    await updateFollowerState([...usersSavedToDb, ...usersGotFromDb], users);
  } else {
    await updateFollowerState(usersGotFromDb, users);
  }
  debug('api.followers', `Finished parsing ${users.length} followers in ${Date.now() - timer}ms`);
};

const updateFollowerState = async(users: (Readonly<Required<UserInterface>>)[], usersFromAPI: { from_name: string; from_id: string; followed_at: string }[]) => {
  // we are handling only latest followers
  // handle users currently not following
  for (const user of users.filter(o => !o.isFollower)) {
    const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
    if (Date.now() - new Date(apiUser.followed_at).getTime() < 2 * constants.HOUR) {
      follow(user.userId, user.userName, new Date(apiUser.followed_at).toISOString());
    }
  }

  users.map(user => {
    const apiUser = usersFromAPI.find(userFromAPI => userFromAPI.from_id === user.userId) as typeof usersFromAPI[0];
    return {
      ...user,
      followedAt:    user.haveFollowedAtLock ? user.followedAt : new Date(apiUser.followed_at).toISOString(),
      isFollower:    user.haveFollowerLock? user.isFollower : true,
      followCheckAt: Date.now(),
    };
  }).forEach(user => {
    changelog.update(user.userId, user);
  });
};