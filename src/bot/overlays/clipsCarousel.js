// @flow
'use strict'

const Overlay = require('./_interface')

class ClipsCarousel extends Overlay {
  constructor () {
    const settings = {
      clips: {
        customPeriodInDays: 31,
        numOfClips: 20,
        timeToNextClip: 45
      }
    }

    const ui = {
      clips: {
        numOfClips: {
          type: 'number-input',
          step: '1',
          min: '1'
        },
        customPeriodInDays: {
          type: 'number-input',
          step: '1',
          min: '1'
        },
        timeToNextClip: {
          type: 'number-input',
          step: '1',
          min: '1'
        }
      },
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/clipscarousel',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/clipscarousel (1920x1080)',
          target: '_blank'
        }
      }
    }

    super({ settings, ui })
  }

  sockets () {
    global.panel.io
      .of('/' + this._name + '/' + this.constructor.name.toLowerCase(), (socket) => {
        socket.on('clips', async (cb) => {
          const clips = await global.api.getTopClips({ period: 'custom', days: this.settings.clips.customPeriodInDays, first: this.settings.clips.numOfClips })
          cb(null, { clips, settings: { timeToNextClip: this.settings.clips.timeToNextClip } })
        })
      })
  }
}

module.exports = new ClipsCarousel()
