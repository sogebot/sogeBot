import axios from 'axios';
import gitCommitInfo from 'git-commit-info';
import _ from 'lodash';
import { getRepository } from 'typeorm';

import { EventList } from './database/entity/eventList';
import { User } from './database/entity/user';
import {
  command, custom, evaluate, ifp, info, list, math, online, param, price, qs, random, ResponseFilter, stream, youtube,
} from './filters';
import { isStreamOnline, stats } from './helpers/api';
import { getBotSender } from './helpers/commons/getBotSender';
import { isBotSubscriber } from './helpers/user/isBot';
import lastfm from './integrations/lastfm';
import spotify from './integrations/spotify';
import songs from './systems/songs';
import tmi from './tmi';
import { translate } from './translate';
import users from './users';

class Message {
  message = '';

  constructor (message: string) {
    this.message = message;
  }

  async global (opts: { escape?: string, sender?: CommandOptions['sender'] }) {
    const variables = {
      game:            stats.value.currentGame,
      language:        stats.value.language,
      viewers:         isStreamOnline.value ? stats.value.currentViewers : 0,
      views:           stats.value.currentViews,
      followers:       stats.value.currentFollowers,
      subscribers:     stats.value.currentSubscribers,
      bits:            isStreamOnline.value ? stats.value.currentBits : 0,
      title:           stats.value.currentTitle,
      source:          opts.sender && typeof opts.sender.discord !== 'undefined' ? 'discord' : 'twitch',
      isBotSubscriber: isBotSubscriber(),
    };
    for (const variable of Object.keys(variables)) {
      const regexp = new RegExp(`\\$${variable}`, 'g');
      this.message = this.message.replace(regexp, String(variables[variable as keyof typeof variables] || ''));
    }

    const version = _.get(process, 'env.npm_package_version', 'x.y.z');
    this.message = this.message.replace(/\$version/g, version.replace('SNAPSHOT', gitCommitInfo().shortHash || 'SNAPSHOT'));

    if (this.message.includes('$latestFollower')) {
      const latestFollower = await getRepository(EventList).createQueryBuilder('events')
        .select('events')
        .orderBy('events.timestamp', 'DESC')
        .where('events.event = :event', { event: 'follow' })
        .getOne();
      this.message = this.message.replace(/\$latestFollower/g, !_.isNil(latestFollower) ? await users.getNameById(latestFollower.userId) : 'n/a');
    }

    // latestSubscriber
    if (this.message.includes('$latestSubscriber')) {
      const latestSubscriber = await getRepository(EventList).createQueryBuilder('events')
        .select('events')
        .orderBy('events.timestamp', 'DESC')
        .where('events.event = :event1', { event1: 'sub' })
        .orWhere('events.event = :event2', { event2: 'resub' })
        .orWhere('events.event = :event3', { event3: 'subgift' })
        .getOne();
      if (latestSubscriber && (this.message.includes('$latestSubscriberMonths') || this.message.includes('$latestSubscriberStreak'))) {
        const latestSubscriberUser = await getRepository(User).findOne({ userId: latestSubscriber.userId });
        this.message = this.message.replace(/\$latestSubscriberMonths/g, latestSubscriberUser ? String(latestSubscriberUser.subscribeCumulativeMonths) : 'n/a');
        this.message = this.message.replace(/\$latestSubscriberStreak/g, latestSubscriberUser ? String(latestSubscriberUser.subscribeStreak) : 'n/a');
      }
      this.message = this.message.replace(/\$latestSubscriber/g, !_.isNil(latestSubscriber) ? await users.getNameById(latestSubscriber.userId) : 'n/a');
    }

    // latestTip, latestTipAmount, latestTipCurrency, latestTipMessage
    if (this.message.includes('$latestTip')
      || this.message.includes('$latestTipAmount')
      || this.message.includes('$latestTipCurrency')
      || this.message.includes('$latestTipMessage')) {
      const latestTip = await getRepository(EventList).createQueryBuilder('events')
        .select('events')
        .orderBy('events.timestamp', 'DESC')
        .where('events.event = :event', { event: 'tip' })
        .andWhere('NOT events.isTest')
        .getOne();
      this.message = this.message.replace(/\$latestTipAmount/g, !_.isNil(latestTip) ? parseFloat(JSON.parse(latestTip.values_json).amount).toFixed(2) : 'n/a');
      this.message = this.message.replace(/\$latestTipCurrency/g, !_.isNil(latestTip) ? JSON.parse(latestTip.values_json).currency : 'n/a');
      this.message = this.message.replace(/\$latestTipMessage/g, !_.isNil(latestTip) ? JSON.parse(latestTip.values_json).message : 'n/a');
      this.message = this.message.replace(/\$latestTip/g, !_.isNil(latestTip) ? await users.getNameById(latestTip.userId) : 'n/a');
    }

    // latestCheer, latestCheerAmount, latestCheerCurrency, latestCheerMessage
    if (this.message.includes('$latestCheerAmount')
    || this.message.includes('$latestCheerMessage')
    || this.message.includes('$latestCheer')) {
      const latestCheer = await getRepository(EventList).createQueryBuilder('events')
        .select('events')
        .orderBy('events.timestamp', 'DESC')
        .where('events.event = :event', { event: 'cheer' })
        .getOne();
      this.message = this.message.replace(/\$latestCheerAmount/g, !_.isNil(latestCheer) ? JSON.parse(latestCheer.values_json).bits : 'n/a');
      this.message = this.message.replace(/\$latestCheerMessage/g, !_.isNil(latestCheer) ? JSON.parse(latestCheer.values_json).message : 'n/a');
      this.message = this.message.replace(/\$latestCheer/g, !_.isNil(latestCheer) ? await users.getNameById(latestCheer.userId) : 'n/a');
    }

    const spotifySong = JSON.parse(spotify.currentSong);
    if (spotifySong !== null && spotifySong.is_playing && spotifySong.is_enabled) {
      // load spotify format
      const format = spotify.format;
      if (opts.escape) {
        spotifySong.song = spotifySong.song.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
        spotifySong.artist = spotifySong.artist.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
      }
      this.message = this.message.replace(/\$spotifySong/g, format.replace(/\$song/g, spotifySong.song).replace(/\$artist/g, spotifySong.artist));
    } else {
      this.message = this.message.replace(/\$spotifySong/g, translate('songs.not-playing'));
    }

    this.message = this.message.replace(/\$lastfmSong/g, lastfm.currentSong ? lastfm.currentSong : translate('songs.not-playing'));

    if (songs.enabled
        && this.message.includes('$ytSong')
        && Object.values(songs.isPlaying).find(o => o)) {
      let currentSong = _.get(JSON.parse(await songs.currentSong), 'title', translate('songs.not-playing'));
      if (opts.escape) {
        currentSong = currentSong.replace(new RegExp(opts.escape, 'g'), `\\${opts.escape}`);
      }
      this.message = this.message.replace(/\$ytSong/g, currentSong);
    } else {
      this.message = this.message.replace(/\$ytSong/g, translate('songs.not-playing'));
    }

    return this.message;
  }

  async parse (attr: { [name: string]: any, sender: CommandOptions['sender'], 'message-type'?: string, forceWithoutAt?: boolean } = { sender: getBotSender() }) {
    this.message = await this.message; // if is promise

    await this.global({ sender: attr.sender });

    await this.parseMessageEach(price, attr);
    await this.parseMessageEach(info, attr);
    await this.parseMessageEach(youtube, attr);
    await this.parseMessageEach(random, attr);
    await this.parseMessageEach(ifp, attr, false);
    if (attr.replaceCustomVariables || typeof attr.replaceCustomVariables === 'undefined') {
      await this.parseMessageVariables(custom, attr);
    }
    await this.parseMessageEach(param, attr, true);
    // local replaces
    if (!_.isNil(attr)) {
      for (let [key, value] of Object.entries(attr)) {
        if (key === 'sender') {
          if (typeof value.username !== 'undefined') {
            value = tmi.showWithAt && attr.forceWithoutAt !== true ? `@${value.username}` : value.username;
          } else {
            value = tmi.showWithAt && attr.forceWithoutAt !== true ? `@${value}` : value;
          }
        }
        this.message = this.message.replace(new RegExp('[$]' + key, 'g'), value);
      }
    }
    await this.parseMessageEach(math, attr);
    await this.parseMessageOnline(online, attr);
    await this.parseMessageCommand(command, attr);
    await this.parseMessageEach(qs, attr, false);
    await this.parseMessageEach(list, attr);
    await this.parseMessageEach(stream, attr);
    await this.parseMessageEval(evaluate, attr);
    await this.parseMessageApi();

    return this.message;
  }

  async parseMessageApi () {
    if (this.message.trim().length === 0) {
      return;
    }

    const rMessage = this.message.match(/\(api\|(http\S+)\)/i);
    if (!_.isNil(rMessage) && !_.isNil(rMessage[1])) {
      this.message = this.message.replace(rMessage[0], '').trim(); // remove api command from message
      const url = rMessage[1].replace(/&amp;/g, '&');
      const response = await axios.get(url);
      if (response.status !== 200) {
        return translate('core.api.error');
      }

      // search for api datas in this.message
      const rData = this.message.match(/\(api\.(?!_response)(\S*?)\)/gi);
      if (_.isNil(rData)) {
        if (_.isObject(response.data)) {
          // Stringify object
          this.message = this.message.replace('(api._response)', JSON.stringify(response.data));
        } else {
          this.message = this.message.replace('(api._response)', response.data.toString().replace(/^"(.*)"/, '$1'));
        }
      } else {
        if (_.isBuffer(response.data)) {
          response.data = JSON.parse(response.data.toString());
        }
        for (const tag of rData) {
          let path = response.data;
          const ids = tag.replace('(api.', '').replace(')', '').split('.');
          _.each(ids, function (id) {
            const isArray = id.match(/(\S+)\[(\d+)\]/i);
            if (isArray) {
              path = path[isArray[1]][isArray[2]];
            } else {
              path = path[id];
            }
          });
          this.message = this.message.replace(tag, !_.isNil(path) ? path : translate('core.api.not-available'));
        }
      }
    }
  }

  async parseMessageCommand (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1]) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '.*?');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          this.message = this.message.replace(rMessage[bkey], await fnc(rMessage[bkey], _.cloneDeep(attr))).trim();
        }
      }
    }
  }

  async parseMessageOnline (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1]) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '(\\S+)');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          if (!(await fnc(rMessage[bkey], _.cloneDeep(attr)))) {
            this.message = '';
          } else {
            this.message = this.message.replace(rMessage[bkey], '').trim();
          }
        }
      }
    }
  }

  async parseMessageEval (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1]) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      // we want to handle # as \w - number in regexp
      regexp = regexp.replace(/#/g, '([\\S ]+)');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], _.cloneDeep(attr));
          if (_.isUndefined(newString) || newString.length === 0) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  async parseMessageVariables (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1], removeWhenEmpty = true) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      regexp = regexp.replace(/#/g, '([a-zA-Z0-9_]+)');
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], _.cloneDeep(attr));
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }

  async parseMessageEach (filters: ResponseFilter, attr: Parameters<ResponseFilter[string]>[1], removeWhenEmpty = true) {
    if (this.message.trim().length === 0) {
      return;
    }
    for (const key in filters) {
      const fnc = filters[key];
      let regexp = _.escapeRegExp(key);

      if (key.startsWith('$')) {
        regexp = regexp.replace(/#/g, '(\\b.+?\\b)');
      } else {
        regexp = regexp.replace(/#/g, '([\\S ]+?)'); // default behavior for if
      }
      const rMessage = this.message.match((new RegExp('(' + regexp + ')', 'g')));
      if (rMessage !== null) {
        for (const bkey in rMessage) {
          const newString = await fnc(rMessage[bkey], _.cloneDeep(attr));
          if ((_.isNil(newString) || newString.length === 0) && removeWhenEmpty) {
            this.message = '';
          }
          this.message = this.message.replace(rMessage[bkey], newString).trim();
        }
      }
    }
  }
}

export { Message };
export default Message;
