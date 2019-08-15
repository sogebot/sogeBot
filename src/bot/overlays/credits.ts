import _ from 'lodash';

import Overlay from './_interface';
import { settings, ui } from '../decorators';

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
    global.panel.io.of('/overlays/credits').on('connection', (socket) => {
      socket.on('load', async (cb) => {
        const when = await global.cache.when();

        if (typeof when.online === 'undefined' || when.online === null) {when.online = _.now() - 5000000000;} // 5000000

        const timestamp = new Date(when.online).getTime();
        let events = await global.db.engine.find('widgetsEventList');

        // change tips if neccessary for aggregated events (need same currency)
        events = events.filter((o) => o.timestamp >= timestamp);
        for (const event of events) {
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
          streamer: global.oauth.broadcasterUsername,
          game: await global.db.engine.findOne('api.current', { key: 'game' }),
          title: await global.db.engine.findOne('api.current', { key: 'title' }),
          clips: this.cShowClips ? await global.api.getTopClips({ period: this.cClipsPeriod, days: this.cClipsCustomPeriodInDays, first: this.cClipsNumOfClips }) : [],
          events: events.filter((o) => o.timestamp >= timestamp),
          customTexts: this.cCustomTextsValues,
          social: this.cSocialValues,
        });
      });
    });
  }
}

export default Credits;
export { Credits };
