// @flow
'use strict'

const Overlay = require('./_interface')

class WheelOfFortune extends Overlay {
  constructor () {
    // define special property name as readonly
    const ui = {
      links: {
        overlay: {
          type: 'link',
          href: '/overlays/wheeloffortune',
          class: 'btn btn-primary btn-block',
          rawText: '/overlays/wheeloffortune (500x55)',
          target: '_blank'
        }
      }
    }

    super({ ui })
  }
}

module.exports = new WheelOfFortune()
