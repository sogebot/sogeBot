import gitCommitInfo from 'git-commit-info';
import _ from 'lodash';
import safeEval from 'safe-eval';
import { getRepository, In } from 'typeorm';

import { EventList } from '../database/entity/eventList';
import { timer } from '../decorators.js';
import lastfm from '../integrations/lastfm.js';
import spotify from '../integrations/spotify.js';
import ranks from '../systems/ranks';
import songs from '../systems/songs.js';
import { translate } from '../translate.js';
import users from '../users.js';
import { isStreamOnline, stats } from './api';
import { getAll } from './customvariables';
import {
  isOwner, isSubscriber, isVIP,
} from './user';
import * as changelog from './user/changelog.js';
import { isBot, isBotSubscriber } from './user/isBot';
import { isBroadcaster } from './user/isBroadcaster';
import { isModerator } from './user/isModerator';

class HelpersFilter {
  @timer()
  async checkFilter(opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> {
    if (!opts.sender) {
      return true;
    }
    const toEval = `(function evaluation () { return ${filter} })()`;

    const $userObject = await changelog.get(opts.sender.userId);
    if (!$userObject) {
      changelog.update(opts.sender.userId, {
        userId:   opts.sender.userId,
        username: opts.sender.userName,
      });
      return checkFilter(opts, filter);
    }
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
    };

    const customVariables = await getAll();
    const context = {
      $source:    typeof opts.sender.discord === 'undefined' ? 'twitch' : 'discord',
      $sender:    opts.sender.userName,
      $is,
      $rank,
      $haveParam: opts.parameters?.length > 0,
      $param:     opts.parameters,
      // add global variables
      ...await this.getGlobalVariables(filter, { sender: opts.sender }),
      ...customVariables,
    };
    let result =  false;
    try {
      result = safeEval(toEval, { ...context, _ });
    } catch (e: any) {
      // do nothing
    }
    return !!result; // force boolean
  }

  @timer()
  async getGlobalVariables(message: string, opts: { escape?: string, sender?: CommandOptions['sender'] }) {
    if (!message.includes('$')) {
      // message doesn't have any variables
      return {};
    }
    const variables: Record<string, any> = {
      $game:            stats.value.currentGame,
      $language:        stats.value.language,
      $viewers:         isStreamOnline.value ? stats.value.currentViewers : 0,
      $views:           stats.value.currentViews,
      $followers:       stats.value.currentFollowers,
      $subscribers:     stats.value.currentSubscribers,
      $bits:            isStreamOnline.value ? stats.value.currentBits : 0,
      $title:           stats.value.currentTitle,
      $source:          opts.sender && typeof opts.sender.discord !== 'undefined' ? 'discord' : 'twitch',
      $isBotSubscriber: isBotSubscriber(),
      $isStreamOnline:  isStreamOnline.value,
    };

    if (message.includes('$version')) {
      const version = _.get(process, 'env.npm_package_version', 'x.y.z');
      variables.$version = version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT');
    }

    if (message.includes('$latestFollower')) {
      const latestFollower = await getRepository(EventList).findOne({ order: { timestamp: 'DESC' }, where: { event: 'follow' } });
      variables.$latestFollower = !_.isNil(latestFollower) ? await users.getNameById(latestFollower.userId) : 'n/a';
    }

    // latestSubscriber
    if (message.includes('$latestSubscriber')) {
      const latestSubscriber = await getRepository(EventList).findOne({
        order: { timestamp: 'DESC' },
        where: { event: In(['sub', 'resub', 'subgift']) },
      });

      if (latestSubscriber && (message.includes('$latestSubscriberMonths') || message.includes('$latestSubscriberStreak'))) {
        const latestSubscriberUser = await changelog.get(latestSubscriber.userId);
        variables.$latestSubscriberMonths = latestSubscriberUser ? String(latestSubscriberUser.subscribeCumulativeMonths) : 'n/a';
        variables.$latestSubscriberStreak = latestSubscriberUser ? String(latestSubscriberUser.subscribeStreak) : 'n/a';
      }
      variables.$latestSubscriber = !_.isNil(latestSubscriber) ? await users.getNameById(latestSubscriber.userId) : 'n/a';
    }

    // latestTip, latestTipAmount, latestTipCurrency, latestTipMessage
    if (message.includes('$latestTip')) {
      const latestTip = await getRepository(EventList).findOne({ order: { timestamp: 'DESC' }, where: { event: 'tip', isTest: false } });
      variables.$latestTipAmount = !_.isNil(latestTip) ? parseFloat(JSON.parse(latestTip.values_json).amount).toFixed(2) : 'n/a';
      variables.$latestTipCurrency = !_.isNil(latestTip) ? JSON.parse(latestTip.values_json).currency : 'n/a';
      variables.$latestTipMessage = !_.isNil(latestTip) ? JSON.parse(latestTip.values_json).message : 'n/a';
      variables.$latestTip = !_.isNil(latestTip) ? await users.getNameById(latestTip.userId) : 'n/a';
    }

    // latestCheer, latestCheerAmount, latestCheerCurrency, latestCheerMessage
    if (message.includes('$latestCheer')) {
      const latestCheer = await getRepository(EventList).findOne({ order: { timestamp: 'DESC' }, where: { event: 'cheer' } });
      variables.$latestCheerAmount = !_.isNil(latestCheer) ? JSON.parse(latestCheer.values_json).bits : 'n/a';
      variables.$latestCheerMessage = !_.isNil(latestCheer) ? JSON.parse(latestCheer.values_json).message : 'n/a';
      variables.$latestCheer = !_.isNil(latestCheer) ? await users.getNameById(latestCheer.userId) : 'n/a';
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

    return variables;
  }
}
const cl = new HelpersFilter();

export const checkFilter = async (opts: CommandOptions | ParserOptions, filter: string): Promise<boolean> => {
  return cl.checkFilter(opts, filter);
};

export const getGlobalVariables = async (message: string, opts: { escape?: string, sender?: CommandOptions['sender'] }): Promise<Record<string, any>> => {
  return cl.getGlobalVariables(message, opts);
};
