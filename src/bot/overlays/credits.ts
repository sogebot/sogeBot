import * as _ from 'lodash';

import Overlay from './_interface';
import { settings, ui } from '../decorators';

class Credits extends Overlay {
  @settings('credits')
  @ui({
    type: 'selector',
    values: ['very slow', 'slow', 'medium', 'fast', 'very fast']
  })
  cCreditsSpeed: 'very slow' | 'slow' | 'medium' | 'fast' | 'very fast' = 'medium';
  @settings('credits')
  cCreditsAggregated: boolean = false;

  @settings('show')
  cShowFollowers: boolean = true;
  @settings('show')
  cShowHosts: boolean = true;
  @settings('show')
  cShowRaids: boolean = true;
  @settings('show')
  cShowSubscribers: boolean = true;
  @settings('show')
  cShowSubgifts: boolean = true;
  @settings('show')
  cShowSubcommunitygifts: boolean = true;
  @settings('show')
  cShowResubs: boolean = true;
  @settings('show')
  cShowCheers: boolean = true;
  @settings('show')
  cShowClips: boolean = true;
  @settings('show')
  cShowTips: boolean = true;

  @settings('text')
  cTextLastMessage: string = 'Thanks for watching';
  @settings('text')
  cTextLastSubMessage: string = '~ see you on the next stream ~';
  @settings('text')
  cTextStreamBy: string = 'Stream by';
  @settings('text')
  cTextFollow: string = 'Followed by';
  @settings('text')
  cTextHost: string = 'Hosted by';
  @settings('text')
  cTextRaid: string = 'Raided by';
  @settings('text')
  cTextCheer: string = 'Cheered by';
  @settings('text')
  cTextSub: string = 'Subscribed by';
  @settings('text')
  cTextResub: string = 'Resubscribed by';
  @settings('text')
  cTextSubgift: string = 'Subgitfs by';
  @settings('text')
  cTextSubcommunitygift: string = 'Sub community gifts by';
  @settings('text')
  cTextTip: string = 'Tips by';

  @settings('customTexts')
  @ui({ type: 'custom-texts' })
  cCustomTextsValues: string[] = [];

  @settings('social')
  @ui({ type: 'social' })
  cSocialValues: string[] = [];

  @settings('clips')
  @ui({ type: 'selector', values: ['stream', 'custom'] })
  cClipsPeriod: 'stream' | 'custom' = 'custom';
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0' })
  cClipsCustomPeriodInDays: number = 31;
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0' })
  cClipsNumOfClips: number = 3;
  @settings('clips')
  cClipsShouldPlay: boolean = true;
  @settings('clips')
  @ui({ type: 'number-input', step: '1', min: '0', max: '100' })
  cClipsVolume: number = 20;

  @ui({
    type: 'link',
    href: '/overlays/credits',
    class: 'btn btn-primary btn-block',
    rawText: '/overlays/credits (1920x1080)',
    target: '_blank'
  }, 'links')
  btnLink: null = null;

  sockets () {
    global.panel.io.of('/overlays/credits').on('connection', (socket) => {
      socket.on('load', async (cb) => {
        const when = await global.cache.when();

        if (typeof when.online === 'undefined' || when.online === null) {when.online = _.now() - 5000000000;} // 5000000

        let timestamp = new Date(when.online).getTime();
        let events = await global.db.engine.find('widgetsEventList');

        // change tips if neccessary for aggregated events (need same currency)
        events = events.filter((o) => o.timestamp >= timestamp);
        for (let event of events) {
          if (!_.isNil(event.amount) && !_.isNil(event.currency)) {
            event.amount = this.cCreditsAggregated
              ? global.currency.exchange(event.amount, event.currency, global.currency.mainCurrency)
              : event.amount;
            event.currency = global.currency.symbol(this.cCreditsAggregated ? global.currency.mainCurrency : event.currency);
          }
        }

        cb(null, {
          settings: {
            clips: {
              shouldPlay: this.cClipsShouldPlay,
              volume: this.cClipsVolume
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
              tip: this.cTextTip
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
              tip: this.cShowTips
            }
          },
          streamer: global.oauth.broadcasterUsername,
          game: await global.db.engine.findOne('api.current', { key: 'game' }),
          title: await global.db.engine.findOne('api.current', { key: 'title' }),
          clips: this.cShowClips ? await global.api.getTopClips({ period: this.cClipsPeriod, days: this.cClipsCustomPeriodInDays, first: this.cClipsNumOfClips }) : [],
          events: events.filter((o) => o.timestamp >= timestamp),
          customTexts: this.cCustomTextsValues,
          social: this.cSocialValues
        });
      });
    });
  }
}

export default Credits;
export { Credits };
