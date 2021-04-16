import _ from 'lodash';
import { getRepository, MoreThanOrEqual } from 'typeorm';

import api from '../api';
import currency from '../currency';
import { EventList, EventListInterface } from '../database/entity/eventList';
import { settings, ui } from '../decorators';
import {
  isStreamOnline, stats, streamStatusChangeSince,
} from '../helpers/api';
import { mainCurrency } from '../helpers/currency';
import { publicEndpoint } from '../helpers/socket';
import oauth from '../oauth';
import users from '../users';
import Overlay from './_interface';

class Credits extends Overlay {
  @settings('credits')
  @ui({
    type:   'selector',
    values: ['very slow', 'slow', 'medium', 'fast', 'very fast'],
  })
  cCreditsSpeed: 'very slow' | 'slow' | 'medium' | 'fast' | 'very fast' = 'medium';

  @settings('show')
  cShowFollowers = true;
  @settings('show')
  cShowHosts = true;
  @settings('show')
  cShowRaids = true;
  @settings('show')
  cShowSubscribers = true;
  @settings('show')
  cShowSubgifts = true;
  @settings('show')
  cShowSubcommunitygifts = true;
  @settings('show')
  cShowResubs = true;
  @settings('show')
  cShowCheers = true;
  @settings('show')
  cShowClips = true;
  @settings('show')
  cShowTips = true;

  @settings('text')
  cTextLastMessage = 'Thanks for watching';
  @settings('text')
  cTextLastSubMessage = '~ see you on the next stream ~';
  @settings('text')
  cTextStreamBy = 'Stream by';
  @settings('text')
  cTextFollow = 'Followed by';
  @settings('text')
  cTextHost = 'Hosted by';
  @settings('text')
  cTextRaid = 'Raided by';
  @settings('text')
  cTextCheer = 'Cheered by';
  @settings('text')
  cTextSub = 'Subscribed by';
  @settings('text')
  cTextResub = 'Resubscribed by';
  @settings('text')
  cTextSubgift = 'Subgitfs by';
  @settings('text')
  cTextSubcommunitygift = 'Sub community gifts by';
  @settings('text')
  cTextTip = 'Tips by';

  @settings('custom_texts')
  @ui({ type: 'credits-custom-texts' })
  cCustomTextsValues: string[] = [];

  @settings('social')
  @ui({ type: 'credits-social' })
  cSocialValues: string[] = [];

  @settings('customization')
  @ui({ type: 'selector', values: ['stream', 'custom'] })
  cClipsPeriod: 'stream' | 'custom' = 'custom';
  @settings('customization')
  @ui({
    type: 'number-input', step: '1', min: '0',
  })
  cClipsCustomPeriodInDays = 31;
  @settings('customization')
  @ui({
    type: 'number-input', step: '1', min: '0',
  })
  cClipsNumOfClips = 3;
  @settings('customization')
  cClipsShouldPlay = true;
  @settings('customization')
  @ui({
    type: 'number-input', step: '1', min: '0', max: '100',
  })
  cClipsVolume = 20;

  sockets () {
    publicEndpoint(this.nsp, 'load', async (cb) => {
      const when = isStreamOnline.value ? streamStatusChangeSince.value : Date.now() - 50000000000;
      const timestamp = new Date(when).getTime();
      const events: (EventListInterface & { username?: string, values?: {
        currency: currency; amount: number;
      };})[] = await getRepository(EventList).find({
        order: { timestamp: 'DESC' },
        where: { timestamp: MoreThanOrEqual(timestamp) },
      });

      // we need to map usernames
      const mapping = await users.getUsernamesFromIds(events.map(o => o.userId));
      for (const event of events) {
        event.username = mapping.get(event.userId) ?? 'n/a';
      }

      // change tips if neccessary for aggregated events (need same currency)
      for (const event of events) {
        event.values = JSON.parse(event.values_json);
        if (event.values) {
          if (!_.isNil(event.values.amount) && !_.isNil(event.values.currency)) {
            event.values.amount = currency.exchange(event.values.amount, event.values.currency, mainCurrency.value);
            event.values.currency = mainCurrency.value;
          }
        }
      }

      cb(null, {
        settings: {
          clips: {
            shouldPlay: this.cClipsShouldPlay,
            volume:     this.cClipsVolume,
          },
          speed: this.cCreditsSpeed,
          text:  {
            lastMessage:      this.cTextLastMessage,
            lastSubMessage:   this.cTextLastSubMessage,
            streamBy:         this.cTextStreamBy,
            follow:           this.cTextFollow,
            host:             this.cTextHost,
            raid:             this.cTextRaid,
            cheer:            this.cTextCheer,
            sub:              this.cTextSub,
            resub:            this.cTextResub,
            subgift:          this.cTextSubgift,
            subcommunitygift: this.cTextSubcommunitygift,
            tip:              this.cTextTip,
          },
          show: {
            follow:           this.cShowFollowers,
            host:             this.cShowHosts,
            raid:             this.cShowRaids,
            sub:              this.cShowSubscribers,
            subgift:          this.cShowSubgifts,
            subcommunitygift: this.cShowSubcommunitygifts,
            resub:            this.cShowResubs,
            cheer:            this.cShowCheers,
            clips:            this.cShowClips,
            tip:              this.cShowTips,
          },
        },
        streamer: oauth.broadcasterUsername,
        game:     stats.value.currentGame,
        title:    stats.value.currentTitle,
        clips:    this.cShowClips ? await api.getTopClips({
          period: this.cClipsPeriod, days: this.cClipsCustomPeriodInDays, first: this.cClipsNumOfClips,
        }) : [],
        events,
        customTexts: this.cCustomTextsValues,
        social:      this.cSocialValues,
      });
    });
  }
}

export default new Credits();
