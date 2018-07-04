const _ = require('lodash')

module.exports = {
  cleanup: async function () {
    let waitForIt = async (resolve, reject) => {
      if (_.isNil(global.db) || !global.db.engine.connected) {
        return setTimeout(() => waitForIt(resolve, reject), 10)
      }
      await global.db.engine.remove('systems.alias', {})
      await global.db.engine.remove('systems.customcommands', {})
      await global.db.engine.remove('systems.cooldown', {})
      await global.db.engine.remove('systems.cooldown.viewers', {})
      await global.db.engine.remove('keywords', {})
      await global.db.engine.remove('settings', {})
      await global.db.engine.remove('timers', {})
      await global.db.engine.remove('timers.responses', {})
      await global.db.engine.remove('users', {})
      await global.db.engine.remove('users.points', {})
      await global.db.engine.remove('raffles', {})
      await global.db.engine.remove('users_ignorelist', {})
      await global.db.engine.remove('cache', {})
      await global.db.engine.remove('cache.when', {})
      await global.db.engine.remove('cache.users', {})
      await global.db.engine.remove('gambling.duel', {})
      await global.db.engine.remove('widgetsEventList', {})
      await global.db.engine.remove('moderation.permit', {})
      await global.db.engine.remove('moderation.warnings', {})
      await global.db.engine.remove('systems.quotes', {})

      // game fightme
      await global.db.engine.remove('games.fightme.settings', {})
      await global.db.engine.remove('games.fightme.users', {})

      resolve()
    }
    return new Promise((resolve, reject) => {
      waitForIt(resolve, reject)
    })
  }
}
