import _ from 'lodash';

import Overlay from './_interface';
import { settings, ui } from '../decorators';
import { publicEndpoint } from '../helpers/socket';
import { getRepository } from 'typeorm';
import { EventList, EventListInterface } from '../database/entity/eventList';
import api from '../api';
import oauth from '../oauth';
import currency from '../currency';

class Credits extends Overlay {
  @settings('credits')
  @ui({
    type: 'selector',
    values: ['very slow', 'slow', 'medium', 'fast', 'very fast'],
  })
  cCreditsSpeed: 'very slow' | 'slow' | 'medium' | 'fast' | 'very fast' = 'medium';
  @settings('credits')
  cCreditsAggregated = false;

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

  @settings('customTexts')
  @ui({ type: 'credits-custom-texts' })
  cCustomTextsValues: string[] = [];

  @settings('social')
  @ui({ type: 'credits-social' })
  cSocialValues: string[] = [];

  @settings('clips')
  @ui({ type: 'selector', values: ['stream', 'custom'] })
  cClipsPeriod: 'stream' | 'custom' = 'custom';
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0' })
  cClipsCustomPeriodInDays = 31;
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0' })
  cClipsNumOfClips = 3;
  @settings('clips')
  cClipsShouldPlay = true;
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0', max: '100' })
  cClipsVolume = 20;

  @ui({
    type: 'link',
    href: '/overlays/credits',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/credits (1920x1080)',
    target: '_blank',
  }, 'links')
  btnLink = null;

  sockets () {
    publicEndpoint(this.nsp, 'load', async (cb) => {
      const when = api.isStreamOnline ? api.streamStatusChangeSince : _.now() - 50000000000;
      const timestamp = new Date(when).getTime();
      const events: (EventListInterface & { values?: {
        currency: currency; amount: number;
      };})[] = await getRepository(EventList).find({
        order: {
          timestamp: 'DESC',
        },
        where: {
          timestamp,
        },
      });

      // change tips if neccessary for aggregated events (need same currency)
      for (const event of events) {
        event.values = JSON.parse(event.values_json);
        if (event.values) {
          if (!_.isNil(event.values.amount) && !_.isNil(event.values.currency)) {
            event.values.amount = this.cCreditsAggregated
              ? currency.exchange(event.values.amount, event.values.currency, currency.mainCurrency)
              : event.values.amount;
            event.values.currency = currency.symbol(this.cCreditsAggregated ? currency.mainCurrency : event.values.currency);
          }
        }
      }

      cb(null, {
        settings: {
          clips: {
            shouldPlay: this.cClipsShouldPlay,
            volume: this.cClipsVolume,
          },
          speed: this.cCreditsSpeed,
          text: {
            lastMessage: this.cTextLastMessage,
            lastSubMessage: this.cTextLastSubMessage,
            streamBy: this.cTextStreamBy,
            follow: this.cTextFollow,
            host: this.cTextHost,
            raid: this.cTextRaid,
            cheer: this.cTextCheer,
            sub: this.cTextSub,
            resub: this.cTextResub,
            subgift: this.cTextSubgift,
            subcommunitygift: this.cTextSubcommunitygift,
            tip: this.cTextTip,
          },
          show: {
            follow: this.cShowFollowers,
            host: this.cShowHosts,
            raid: this.cShowRaids,
            sub: this.cShowSubscribers,
            subgift: this.cShowSubgifts,
            subcommunitygift: this.cShowSubcommunitygifts,
            resub: this.cShowResubs,
            cheer: this.cShowCheers,
            clips: this.cShowClips,
            tip: this.cShowTips,
          },
        },
        streamer: oauth.broadcasterUsername,
        game: api.stats.currentGame,
        title: api.stats.currentTitle,
        clips: this.cShowClips ? await api.getTopClips({ period: this.cClipsPeriod, days: this.cClipsCustomPeriodInDays, first: this.cClipsNumOfClips }) : [],
        events,
        customTexts: this.cCustomTextsValues,
        social: this.cSocialValues,
      });
    });
  }
}

export default new Credits();
