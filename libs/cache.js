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
      await global.db.engine.update('cache', { key: 'status' }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache', { key: 'status' })
      return _.get(cache, 'value', '')
    }
  }

  // attribute
  async channelId (value) {
    if (value) {
      // setter
      await global.db.engine.update('cache', { key: 'channelId' }, {
        value: value
      })
      return value
    } else {
      // getter
      let cache = await global.db.engine.findOne('cache', { key: 'channelId' })
      return _.get(cache, 'value', null)
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

  async gamesTitles (data) {
    if (data) {
      // setter
      // re-save full object - NeDB issue with $set on object workaround - NeDB is not deleting missing keys
      await global.db.engine.remove('cache.titles', {})
      for (let [game, titles] of Object.entries(data)) {
        for (let title of titles) await global.db.engine.insert('cache.titles', { game, title })
      }
      return data
    } else {
      // getter
      let titles = {}
      for (let object of await global.db.engine.find('cache.titles')) {
        if (_.isNil(titles[object.game])) titles[object.game] = []
        titles[object.game].push(object.title)
      }
      return titles
    }
  }
}

module.exports = Cache
