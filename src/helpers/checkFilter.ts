import { existsSync, readFileSync } from 'fs';

import { EventList } from '@entity/eventList.js';
import { getTime } from '@sogebot/ui-helpers/getTime.js';
import gitCommitInfo from 'git-commit-info';
import _, { sortBy } from 'lodash-es';
import { In } from 'typeorm';
import { VM } from 'vm2';

import { isStreamOnline, stats } from './api/index.js';
import { getAll } from './customvariables/index.js';
import * as changelog from './user/changelog.js';
import getNameById from './user/getNameById.js';
import {
  isOwner, isSubscriber, isVIP,
} from './user/index.js';
import { isBot, isBotSubscriber } from './user/isBot.js';
import { isBroadcaster } from './user/isBroadcaster.js';
import { isModerator } from './user/isModerator.js';
import { timer } from '../decorators.js';
import lastfm from '../integrations/lastfm.js';
import spotify from '../integrations/spotify.js';
import ranks from '../systems/ranks.js';
import songs from '../systems/songs.js';
import { translate } from '../translate.js';

import { CacheGames } from '~/database/entity/cacheGames.js';
import { AppDataSource } from '~/database.js';
import { Message } from  '~/message.js';
import { variables as vars } from '~/watchers.js';

class HelpersFilter {
  @timer()
  async checkFilter(opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> {
    if (!opts.sender) {
      return true;
    }

    const $userObject = await changelog.get(opts.sender.userId);
    if (!$userObject) {
      changelog.update(opts.sender.userId, {
        userId:   opts.sender.userId,
        userName: opts.sender.userName,
      });
      return checkFilter(opts, filter);
    }

    const processedFilter = await new Message(await filter as string).parse({ ...opts, sender: opts.sender, forceWithoutAt: true, isFilter: true, param: opts.parameters });
    const toEval = `(function () { return ${processedFilter} })`;
    let $rank: string | null = null;
    if (ranks.enabled) {
      const rank = await ranks.get($userObject);
      $rank = typeof rank.current === 'string' || rank.current === null ? rank.current : rank.current.rank;
    }

    const $is = {
      moderator:   isModerator($userObject),
      subscriber:  isSubscriber($userObject),
      vip:         isVIP($userObject),
      broadcaster: isBroadcaster(opts.sender.userName),
      bot:         isBot(opts.sender.userName),
      owner:       isOwner(opts.sender.userName),
      newchatter:  opts.isFirstTimeMessage,
    };

    const customVariables = await getAll();
    const sandbox = {
      $source:    typeof opts.discord === 'undefined' ? 'twitch' : 'discord',
      $sender:    opts.sender.userName,
      $is,
      $rank,
      $haveParam: opts.parameters?.length > 0,
      $param:     opts.parameters,
      // add global variables
      ...await this.getGlobalVariables(processedFilter, { sender: opts.sender, discord: opts.discord }),
      ...customVariables,
    };
    let result =  false;
    try {
      const vm = new VM({ sandbox });
      result = vm.run(toEval)();
    } catch (e: any) {
      // do nothing
    }
    return !!result; // force boolean
  }

  @timer()
  async getGlobalVariables(message: string, opts: { escape?: string, sender?: CommandOptions['sender'] | { userName: string; userId: string }, discord?: CommandOptions['discord'] }) {
    if (!message.includes('$')) {
      // message doesn't have any variables
      return {};
    }

    const uptime = vars.get('services.twitch.uptime') as number;

    const variables: Record<string, any> = {
      $game:               stats.value.currentGame,
      $language:           stats.value.language,
      $viewers:            isStreamOnline.value ? stats.value.currentViewers : 0,
      $followers:          stats.value.currentFollowers,
      $subscribers:        stats.value.currentSubscribers,
      $bits:               isStreamOnline.value ? stats.value.currentBits : 0,
      $title:              stats.value.currentTitle,
      $source:             opts.sender && typeof opts.discord !== 'undefined' ? 'discord' : 'twitch',
      $isBotSubscriber:    isBotSubscriber(),
      $isStreamOnline:     isStreamOnline.value,
      $uptime:             getTime(Date.now() - uptime, false),
      $channelDisplayName: stats.value.channelDisplayName,
      $channelUserName:    stats.value.channelUserName,
    };

    if (message.includes('$thumbnail') && stats.value.currentGame) {
      const gameFromDb = await AppDataSource.getRepository(CacheGames).findOneBy({ name: stats.value.currentGame });
      if (gameFromDb && gameFromDb.thumbnail) {
        // replace $thumbnail
        variables.$thumbnail = gameFromDb.thumbnail;

        // replace $thumbnail with width and height defined
        const regex = /\$thumbnail\((?<width>\d+)x(?<height>\d+)\)/gm;
        let m;

        while ((m = regex.exec(message)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
          if (m.index === regex.lastIndex) {
            regex.lastIndex++;
          }

          if (!m.groups) {
            continue;
          }
          const width = m.groups.width;
          const height = m.groups.height;

          variables[`$thumbnail(${width}x${height})`] = gameFromDb.thumbnail
            .replace('{width}', width)
            .replace('{height}', height);
        }
      }
    }

    if (message.includes('$version')) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      const commitFile = existsSync('./.commit') ? readFileSync('./.commit').toString() : null;
      variables.$version = version.replace('SNAPSHOT', commitFile && commitFile.length > 0 ? commitFile : gitCommitInfo().shortHash || 'SNAPSHOT');
    }

    if (message.includes('$latestFollower')) {
      const latestFollower = await AppDataSource.getRepository(EventList).findOne({ order: { timestamp: 'DESC' }, where: { event: 'follow' } });
      variables.$latestFollower = !_.isNil(latestFollower) ? await getNameById(latestFollower.userId) : 'n/a';
    }

    // latestSubscriber
    if (message.includes('$latestSubscriber')) {
      const latestSubscriber = await AppDataSource.getRepository(EventList).findOne({
        order: { timestamp: 'DESC' },
        where: { event: In(['sub', 'resub', 'subgift']) },
      });

      if (latestSubscriber && (message.includes('$latestSubscriberMonths') || message.includes('$latestSubscriberStreak'))) {
        const latestSubscriberUser = await changelog.get(latestSubscriber.userId);
        variables.$latestSubscriberMonths = latestSubscriberUser ? String(latestSubscriberUser.subscribeCumulativeMonths) : 'n/a';
        variables.$latestSubscriberStreak = latestSubscriberUser ? String(latestSubscriberUser.subscribeStreak) : 'n/a';
      }
      variables.$latestSubscriber = !_.isNil(latestSubscriber) ? await getNameById(latestSubscriber.userId) : 'n/a';
    }

    // latestTip, latestTipAmount, latestTipCurrency, latestTipMessage
    if (message.includes('$latestTip')) {
      const latestTip = await AppDataSource.getRepository(EventList).findOne({ order: { timestamp: 'DESC' }, where: { event: 'tip', isTest: false } });
      variables.$latestTipAmount = !_.isNil(latestTip) ? parseFloat(JSON.parse(latestTip.values_json).amount).toFixed(2) : 'n/a';
      variables.$latestTipCurrency = !_.isNil(latestTip) ? JSON.parse(latestTip.values_json).currency : 'n/a';
      variables.$latestTipMessage = !_.isNil(latestTip) ? JSON.parse(latestTip.values_json).message : 'n/a';
      variables.$latestTip = !_.isNil(latestTip) ? await getNameById(latestTip.userId) : 'n/a';
    }

    // latestCheer, latestCheerAmount, latestCheerCurrency, latestCheerMessage
    if (message.includes('$latestCheer')) {
      const latestCheer = await AppDataSource.getRepository(EventList).findOne({ order: { timestamp: 'DESC' }, where: { event: 'cheer' } });
      variables.$latestCheerAmount = !_.isNil(latestCheer) ? JSON.parse(latestCheer.values_json).bits : 'n/a';
      variables.$latestCheerMessage = !_.isNil(latestCheer) ? JSON.parse(latestCheer.values_json).message : 'n/a';
      variables.$latestCheer = !_.isNil(latestCheer) ? await getNameById(latestCheer.userId) : 'n/a';
    }

    const spotifySong = JSON.parse(spotify.currentSong);
    if (spotifySong !== null && spotifySong.is_playing && spotifySong.is_enabled) {
      // load spotify format
      const format = spotify.format;
      if (opts.escape) {
        spotifySong.song = spotifySong.song.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
        spotifySong.artist = spotifySong.artist.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
      }
      variables.$spotifySong = format.replace(/\$song/g, spotifySong.song).replace(/\$artist/g, spotifySong.artist);
    } else {
      variables.$spotifySong = translate('songs.not-playing');
    }

    variables.$lastfmSong = lastfm.currentSong ? lastfm.currentSong : translate('songs.not-playing');

    if (songs.enabled
        && message.includes('$ytSong')
        && Object.values(songs.isPlaying).find(o => o)) {
      let currentSong = _.get(JSON.parse(await songs.currentSong), 'title', translate('songs.not-playing'));
      if (opts.escape) {
        currentSong = currentSong.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
      }
      variables.$ytSong = currentSong;
    } else {
      variables.$ytSong = translate('songs.not-playing');
    }

    const variablesSortedByKey: Record<string, string> = {};
    sortBy(Object.keys(variables), (b => -b.length)).forEach(val => {
      variablesSortedByKey[val] = variables[val];
    });

    return variablesSortedByKey;
  }
}
const cl = new HelpersFilter();

export const checkFilter = async (opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> => {
  return cl.checkFilter(opts, filter);
};

export const getGlobalVariables = async (message: string, opts: { escape?: string, sender?: CommandOptions['sender'] | { userName: string; userId: string }, discord?: CommandOptions['discord'] }): Promise<Record<string, any>> => {
  return cl.getGlobalVariables(message, opts);
};
