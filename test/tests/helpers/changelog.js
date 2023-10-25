/* global */

import('../../general.js');
import assert from 'assert';
import { AppDataSource } from '../../../dest/database.js';

import { db } from '../../general.js';

describe('User changelog tests - @func1', () => {
  let User;
  let changelog;
  before(async () => {
    await db.cleanup();
    changelog = await import('../../../dest/helpers/user/changelog.js');
    User = (await import('../../../dest/database/entity/user.js')).User;
  });

  it('get of unknown user should return null', async () => {
    const data = await changelog.get('12345');
    assert.equal(data, null);
  });

  it('add if several data should return correct data', async () => {
    const expected = {
      userId:                    '999999',
      userName:                  'lorem',
      watchedTime:               55555,
      points:                    9,
      messages:                  19,
      subscribedAt:              null,
      subscribeTier:             '0',
      subscribeStreak:           0,
      pointsByMessageGivenAt:    0,
      pointsOfflineGivenAt:      0,
      pointsOnlineGivenAt:       0,
      profileImageUrl:           '',
      rank:                      '',
      seenAt:                    null,
      subscribeCumulativeMonths: 0,
      giftedSubscribes:          0,
      haveCustomRank:            false,
      haveSubscribedAtLock:      false,
      haveSubscriberLock:        false,
      isModerator:               false,
      isOnline:                  false,
      isSubscriber:              false,
      isVIP:                     false,
      chatTimeOffline:           0,
      chatTimeOnline:            0,
      createdAt:                 null,
      displayname:               '',
      extra:                     {
        jackpotWins: 3,
        levels:      {
          xp:                1,
          xpOfflineGivenAt:  2,
          xpOfflineMessages: 3,
          xpOnlineGivenAt:   2,
          xpOnlineMessages:  3,
        },
      },
    };
    changelog.update('999999', {
      userName:    'aaaa',
      watchedTime: 55555,
    });
    changelog.update('999999', {
      userName: 'lorem',
      points:   20,
      messages: 18,
    });
    changelog.update('999999', {
      points: 8,
      extra:  {
        jackpotWins: 1,
        levels:      {
          xp:                1,
          xpOfflineGivenAt:  1,
          xpOfflineMessages: 3,
          xpOnlineGivenAt:   2,
        },
      },
    });
    changelog.update('999999', {
      extra: {
        jackpotWins: 2,
        levels:      {
          xp:                1,
          xpOfflineGivenAt:  2,
          xpOfflineMessages: 3,
          xpOnlineGivenAt:   2,
          xpOnlineMessages:  3,
        },
      },
    });
    changelog.increment('999999', {
      points:   1,
      messages: 1,
      extra:    { jackpotWins: 1 },
    });
    const data = await changelog.get('999999');
    assert.deepEqual(data, expected);
  });

  it('after flush all data should be in database', async () => {
    const expected = {
      userId:                    '999999',
      userName:                  'lorem',
      watchedTime:               55555,
      points:                    9,
      messages:                  19,
      subscribedAt:              null,
      subscribeTier:             '0',
      subscribeStreak:           0,
      pointsByMessageGivenAt:    0,
      pointsOfflineGivenAt:      0,
      pointsOnlineGivenAt:       0,
      profileImageUrl:           '',
      rank:                      '',
      seenAt:                    null,
      subscribeCumulativeMonths: 0,
      giftedSubscribes:          0,
      haveCustomRank:            false,
      haveSubscribedAtLock:      false,
      haveSubscriberLock:        false,
      isModerator:               false,
      isOnline:                  false,
      isSubscriber:              false,
      isVIP:                     false,
      chatTimeOffline:           0,
      chatTimeOnline:            0,
      createdAt:                 null,
      displayname:               '',
      extra:                     {
        jackpotWins: 3,
        levels:      {
          xp:                1,
          xpOfflineGivenAt:  2,
          xpOfflineMessages: 3,
          xpOnlineGivenAt:   2,
          xpOnlineMessages:  3,
        },
      },
    };
    await changelog.flush();
    const user = await AppDataSource.getRepository(User).findOneBy({ userId: '999999'});
    assert.deepEqual(user, expected);
  });
});
