const _ = require('lodash')

class Cache {
  async when (data) {
    if (data) {
      // setter
      await global.db.engine.update('cache', { key: 'when' }, {
        online: _.get(data, 'online', null),
        offline: _.get(data, 'offline', null)
      })
      return {
        online: _.get(data, 'online', null),
        offline: _.get(data, 'offline', null)
      }
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache', { key: 'when' })
      return {
        online: _.get(cache, 'online', null),
        offline: _.get(cache, 'offline', null)
      }
    }
  }

  // attribute
  async gameCache (value) {
    if (value) {
      // setter
      await global.db.engine.update('cache', { key: 'game' }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache', { key: 'game' })
      return _.get(cache, 'value', '')
    }
  }

  // attribute
  async rawStatus (value) {
    if (value) {
      // setter
      await global.db.engine.update('cache', { key: 'title' }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache', { key: 'title' })
      return _.get(cache, 'value', '')
    }
  }

  // attribute
  async isOnline (value) {
    if (!_.isNil(value)) {
      // setter
      await global.db.engine.update('cache', { key: 'isOnline' }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache', { key: 'isOnline' })
      return _.get(cache, 'value', false)
    }
  }
}

module.exports = Cache
