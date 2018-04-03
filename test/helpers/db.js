const _ = require('lodash')

module.exports = {
  cleanup: async function () {
    let waitForIt = async (resolve, reject) => {
      if (_.isNil(global.db) || !global.db.engine.connected) {
        return setTimeout(() => waitForIt(resolve, reject), 10)
      }
      await global.db.engine.remove('alias', {})
      await global.db.engine.remove('commands', {})
      await global.db.engine.remove('cooldowns', {})
      await global.db.engine.remove('cooldown.viewers', {})
      await global.db.engine.remove('keywords', {})
      await global.db.engine.remove('settings', {})
      await global.db.engine.remove('timers', {})
      await global.db.engine.remove('timers.responses', {})
      await global.db.engine.remove('users', {})
      await global.db.engine.remove('cooldowns', {})
      await global.db.engine.remove('raffles', {})
      await global.db.engine.remove('users_ignorelist', {})
      await global.db.engine.remove('cache', {})
      await global.db.engine.remove('cache.when', {})
      await global.db.engine.remove('cache.users', {})
      await global.db.engine.remove('gambling.duel', {})
      await global.db.engine.remove('widgetsEventList', {})
      resolve()
    }
    return new Promise((resolve, reject) => {
      waitForIt(resolve, reject)
    })
  }
}
