'use strict';

import { error } from 'console';

import { DAY, MINUTE } from '@sogebot/ui-helpers/constants';
import { isNil } from 'lodash';
import { LessThan } from 'typeorm';
import { AppDataSource } from '~/database';

import Core from '~/_interface';
import { TwitchStats, TwitchStatsInterface } from '~/database/entity/twitch';
import { persistent } from '~/decorators';
import { onStreamStart } from '~/decorators/on';
import { stats } from '~/helpers/api';
import { debug } from '~/helpers/log';
import { adminEndpoint } from '~/helpers/socket';

class Stats extends Core {
  @persistent()
    currentFollowers = 0;
  @persistent()
    currentSubscribers = 0;

  showInUI = false;
  latestTimestamp = 0;

  @onStreamStart()
  async setInitialValues() {
    this.currentFollowers = stats.value.currentFollowers;
    this.currentSubscribers = stats.value.currentSubscribers;
    debug('stats', JSON.stringify({
      currentFollowers: this.currentFollowers, currentSubscribers: this.currentSubscribers,
    }));
  }

  sockets() {
    adminEndpoint('/', 'getLatestStats', async function (cb) {
      try {
        // cleanup
        AppDataSource.getRepository(TwitchStats).delete({ 'whenOnline': LessThan(Date.now() - (DAY * 31)) });

        const statsFromDb = await AppDataSource.getRepository(TwitchStats)
          .createQueryBuilder('stats')
          .offset(1)
          .cache(true)
          .limit(Number.MAX_SAFE_INTEGER)
          .where('stats.whenOnline > :whenOnline', { whenOnline: Date.now() - (DAY * 31) })
          .orderBy('stats.whenOnline', 'DESC')
          .getMany();
        const statsToReturn = {
          currentViewers:     0,
          currentSubscribers: 0,
          currentBits:        0,
          currentTips:        0,
          chatMessages:       0,
          currentFollowers:   0,
          maxViewers:         0,
          newChatters:        0,
          currentWatched:     0,
        };
        if (statsFromDb.length > 0) {
          for (const stat of statsFromDb) {
            statsToReturn.currentViewers += _self.parseStat(stat.currentViewers);
            statsToReturn.currentBits += _self.parseStat(stat.currentBits);
            statsToReturn.currentTips += _self.parseStat(stat.currentTips);
            statsToReturn.chatMessages += _self.parseStat(stat.chatMessages);
            statsToReturn.maxViewers += _self.parseStat(stat.maxViewers);
            statsToReturn.newChatters += _self.parseStat(stat.newChatters);
            statsToReturn.currentWatched += _self.parseStat(stat.currentWatched);
          }
          statsToReturn.currentViewers = Number(Number(statsToReturn.currentViewers / statsFromDb.length).toFixed(0));
          statsToReturn.currentBits = Number(Number(statsToReturn.currentBits / statsFromDb.length).toFixed(0));
          statsToReturn.currentTips = Number(Number(statsToReturn.currentTips / statsFromDb.length).toFixed(2));
          statsToReturn.chatMessages = Number(Number(statsToReturn.chatMessages / statsFromDb.length).toFixed(0));
          statsToReturn.maxViewers = Number(Number(statsToReturn.maxViewers / statsFromDb.length).toFixed(0));
          statsToReturn.newChatters = Number(Number(statsToReturn.newChatters / statsFromDb.length).toFixed(0));
          statsToReturn.currentWatched = Number(Number(statsToReturn.currentWatched / statsFromDb.length).toFixed(0));
          cb(null, {
            ...statsToReturn, currentFollowers: _self.currentFollowers, currentSubscribers: _self.currentSubscribers,
          });
        } else {
          cb(null, {});
        }
      } catch (e: any) {
        error(e);
        cb(e.stack, {});
      }
    });
  }

  async save(data: Required<TwitchStatsInterface> & { timestamp: number }) {
    if (data.timestamp - this.latestTimestamp >= MINUTE * 15) {
      const whenOnline = new Date(data.whenOnline).getTime();
      const statsFromDB = await AppDataSource.getRepository(TwitchStats).findOneBy({ 'whenOnline': whenOnline });
      await AppDataSource.getRepository(TwitchStats).save({
        currentViewers:     statsFromDB ? Math.round((data.currentViewers + statsFromDB.currentViewers) / 2) : data.currentViewers,
        whenOnline:         statsFromDB ? statsFromDB.whenOnline : Date.now(),
        currentSubscribers: data.currentSubscribers,
        currentBits:        data.currentBits,
        currentTips:        data.currentTips,
        chatMessages:       data.chatMessages,
        currentFollowers:   data.currentFollowers,
        maxViewers:         data.maxViewers,
        newChatters:        data.newChatters,
        currentWatched:     data.currentWatched,
      });

      this.latestTimestamp = data.timestamp;
    }
  }

  parseStat(value: null | string | number) {
    return parseFloat(isNil(value) || isNaN(parseFloat(String(value))) ? String(0) : String(value));
  }
}

const _self = new Stats();
export default _self;
