'use strict'

// bot libraries
const System = require('./_interface')

class Checklist extends System {
  constructor () {
    const settings = {
      checklist: {
        itemsArray: []
      }
    }
    const ui = {
      checklist: {
        itemsArray: {
          type: 'configurable-list'
        }
      }
    }
    const onStreamStop = [
      () => {
        global.db.engine.remove(this.collection.data, {})
      }
    ]

    super({ settings, ui, onStreamStop })
  }
}

module.exports = new Checklist()
