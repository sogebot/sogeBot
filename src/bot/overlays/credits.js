// @flow
'use strict'

const _ = require('lodash')

const Overlay = require('./_interface')

class Credits extends Overlay {
  constructor () {
    const settings = {
      credits: {
        speed: 'medium'
      },
      show: {
        followers: true,
        hosts: true,
        raids: true,
        subscribers: true,
        subgifts: true,
        subcommunitygifts: true,
        resubs: true,
        cheers: true,
        clips: true,
        tips: true
      },
      text: {
        lastMessage: 'Thanks for watching',
        lastSubMessage: '~ see you on the next stream ~',
        streamBy: 'Stream by',
        follow: 'Followed by',
        host: 'Hosted by',
        raid: 'Raided by',
        cheer: 'Cheered by',
        sub: 'Subscribed by',
        resub: 'Resubscribed by',
        subgift: 'Subgitfs by',
        subcommunitygift: 'Sub community gifts by',
        tip: 'Tips by'
      },
      customTexts: {
        values: []
      },
      social: {
        values: []
      },
      clips: {
        period: 'custom',
        customPeriodInDays: 31,
        numOfClips: 3,
        shouldPlay: true,
        volume: 20
      }
    }

    const ui = {
      customTexts: {
        values: {
          type: 'custom-texts'
        }
      },
      social: {
        values: {
          type: 'social'
        }
      },
      credits: {
        speed: {
          type: 'selector',
          values: ['very slow', 'slow', 'medium', 'fast', 'very fast']
        }
      },
      clips: {
        period: {
          type: 'selector',
          values: ['stream', 'custom']
        }
      },
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/credits',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/credits (1920x1080)',
          target: '_blank'
        }
      }
    }
    super({ settings, ui })
  }

  sockets () {
    global.panel.io.of('/overlays/credits').on('connection', (socket) => {
      socket.on('load', async (cb) => {
        const when = await global.cache.when()

        if (typeof when.online === 'undefined' || when.online === null) when.online = _.now() - 5000000000 // 5000000

        let timestamp = new Date(when.online).getTime()
        let events = await global.db.engine.find('widgetsEventList')

        // change tips if neccessary for aggregated events (need same currency)
        events = events.filter((o) => o.timestamp >= timestamp)
        for (let event of events) {
          if (!_.isNil(event.amount) && !_.isNil(event.currency)) {
            event.amount = await global.configuration.getValue('creditsAggregate')
              ? global.currency.exchange(event.amount, event.currency, global.currency.settings.currency.mainCurrency)
              : event.amount
            event.currency = global.currency.symbol(await global.configuration.getValue('creditsAggregate') ? global.currency.settings.currency.mainCurrency : event.currency)
          }
        }

        cb(null, {
          settings: {
            clips: {
              shouldPlay: this.settings.clips.shouldPlay,
              volume: this.settings.clips.volume
            },
            speed: this.settings.credits.speed,
            text: {
              lastMessage: this.settings.text.lastMessage,
              lastSubMessage: this.settings.text.lastSubMessage,
              streamBy: this.settings.text.streamBy,
              follow: this.settings.text.follow,
              host: this.settings.text.host,
              raid: this.settings.text.raid,
              cheer: this.settings.text.cheer,
              sub: this.settings.text.sub,
              resub: this.settings.text.resub,
              subgift: this.settings.text.subgift,
              subcommunitygift: this.settings.text.subcommunitygift,
              tip: this.settings.text.tip
            },
            show: {
              follow: this.settings.show.followers,
              host: this.settings.show.hosts,
              raid: this.settings.show.raids,
              sub: this.settings.show.subscribers,
              subgift: this.settings.show.subgifts,
              subcommunitygift: this.settings.show.subcommunitygifts,
              resub: this.settings.show.resubs,
              cheer: this.settings.show.cheers,
              clips: this.settings.show.clips,
              tip: this.settings.show.tips
            }
          },
          streamer: global.oauth.settings.broadcaster.username,
          game: await global.db.engine.findOne('api.current', { key: 'game' }),
          title: await global.db.engine.findOne('api.current', { key: 'title' }),
          clips: this.settings.show.clips ? await global.api.getTopClips({ period: this.settings.clips.period, days: this.settings.clips.customPeriodInDays, first: this.settings.clips.numOfClips }) : [],
          events: events.filter((o) => o.timestamp >= timestamp),
          customTexts: this.settings.customTexts.values,
          social: this.settings.social.values
        })
      })
    })
  }
}

module.exports = new Credits()
