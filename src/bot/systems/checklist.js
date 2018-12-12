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
    const on = {
      streamEnd: () => {
        global.db.engine.remove(this.collection.data, {})
      }
    }

    super({ settings, ui, on })
  }
}

module.exports = new Checklist()
