// @flow
'use strict'

const Overlay = require('./_interface')

class Clips extends Overlay {
  constructor () {
    const settings = {
      clips: {
        volume: 0,
        filter: 'none',
        label: true
      }
    }

    const ui = {
      clips: {
        filter: {
          type: 'selector',
          values: ['none', 'grayscale', 'sepia', 'tint', 'washed']
        }
      },
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/clips',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/clips (640x360)',
          target: '_blank'
        }
      }
    }

    super({ settings, ui })
  }

  async showClip (clipId: string) {
    let clips = (await global.api.getClipById(clipId)).data || []
    for (let c of clips) {
      c.mp4 = c.thumbnail_url.replace('-preview-480x272.jpg', '.mp4')
    }

    global.panel.io
      .of('/' + this._name + '/' + this.constructor.name.toLowerCase())
      .emit('clips', {
        clips,
        settings: {
          volume: this.settings.clips.volume,
          filter: this.settings.clips.filter,
          label: this.settings.clips.label
        }
      })
  }
}

module.exports = new Clips()
