const _ = require('lodash')
const chalk = require('chalk')
const variable = require('./variable')

const startup = _.now()

const __DEBUG__ = (process.env.DEBUG && process.env.DEBUG.includes('test'))

module.exports = {
  cleanup: async function () {
    let waitForIt = async (resolve, reject) => {
      if (_.isNil(global.db) || !global.db.engine.connected || _.isNil(global.systems) || _.now() - startup < 10000) {
        return setTimeout(() => waitForIt(resolve, reject), 10)
      }

      if (__DEBUG__) {
        console.log(chalk.bgRed('*** Cleaning up collections ***'))
      }

      const collections = await global.db.engine.collections()
      for (let c of collections) {
        await global.db.engine.remove(c, {})
      }

      global.oauth.settings.general.channel = 'soge__'
      await variable.isEqual('global.oauth.settings.general.channel', 'soge__')

      global.oauth.settings.general.owners = ['soge__', '__owner__']
      await variable.isEqual('global.oauth.settings.general.owners', ['soge__', '__owner__'])

      global.oauth.settings.broadcaster.username = 'broadcaster'
      await variable.isEqual('global.oauth.settings.broadcaster.username', 'broadcaster')

      resolve()
    }
    return new Promise((resolve, reject) => {
      waitForIt(resolve, reject)
    })
  }
}
