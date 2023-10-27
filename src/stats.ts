'use strict';

import { error } from 'console';

import { DAY, MINUTE } from '@sogebot/ui-helpers/constants.js';
import { get, isNil } from 'lodash-es';
import { LessThan } from 'typeorm';

import Core from '~/_interface.js';
import { TwitchStats, TwitchStatsInterface } from '~/database/entity/twitch.js';
import { AppDataSource } from '~/database.js';
import { onStreamStart } from '~/decorators/on.js';
import { persistent } from '~/decorators.js';
import {
  chatMessagesAtStart, isStreamOnline, rawStatus, stats, streamStatusChangeSince,
} from '~/helpers/api/index.js';
import { debug } from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import { linesParsed } from '~/helpers/parser.js';
import lastfm from '~/integrations/lastfm.js';
import spotify from '~/integrations/spotify.js';
import { adminMiddleware } from '~/socket.js';
import songs from '~/systems/songs.js';
import translateLib, { translate } from '~/translate.js';
import { variables } from '~/watchers.js';

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
    if (!app) {
      setTimeout(() => this.sockets(), 100);
      return;
    }

    app.get('/api/stats/current', adminMiddleware, async (__, res) => {
      try {
        if (!translateLib.isLoaded) {
          throw new Error('Translation not yet loaded');
        }

        const ytCurrentSong = Object.values(songs.isPlaying).find(o => o) ? get(JSON.parse(songs.currentSong), 'title', null) : null;
        const spotifySongParsed = JSON.parse(spotify.currentSong);
        let spotifyCurrentSong: null | string = null;
        if (spotifySongParsed && spotifySongParsed.is_playing) {
          spotifyCurrentSong = `${spotifySongParsed.song} - ${spotifySongParsed.artist}`;
        }

        const broadcasterType = variables.get('services.twitch.broadcasterType') as string;
        const data = {
          broadcasterType:             broadcasterType,
          uptime:                      isStreamOnline.value ? streamStatusChangeSince.value : null,
          currentViewers:              stats.value.currentViewers,
          currentSubscribers:          stats.value.currentSubscribers,
          currentBits:                 stats.value.currentBits,
          currentTips:                 stats.value.currentTips,
          chatMessages:                isStreamOnline.value ? linesParsed - chatMessagesAtStart.value : 0,
          currentFollowers:            stats.value.currentFollowers,
          maxViewers:                  stats.value.maxViewers,
          newChatters:                 stats.value.newChatters,
          game:                        stats.value.currentGame,
          status:                      stats.value.currentTitle,
          rawStatus:                   rawStatus.value,
          currentSong:                 lastfm.currentSong || ytCurrentSong || spotifyCurrentSong || translate('songs.not-playing'),
          currentWatched:              stats.value.currentWatchedTime,
          tags:                        stats.value.currentTags ?? [],
          contentClassificationLabels: stats.value.contentClasificationLabels ?? [],
        };
        res.send(data);
      } catch (e: any) {
        if (e instanceof Error) {
          if (e.message !== 'Translation not yet loaded') {
            error(e);
            res.status(500).send(e.message);
          }
        }
      }
    });

    app.get('/api/stats/latest', adminMiddleware, async (__, res) => {
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
          res.send({
            ...statsToReturn, currentFollowers: _self.currentFollowers, currentSubscribers: _self.currentSubscribers,
          });
        } else {
          res.status(204).send();
        }
      } catch (e: any) {
        error(e);
        res.status(500).send();
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
