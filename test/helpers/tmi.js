
const sinon = require('sinon')
const _ = require('lodash')

var connected = false

module.exports = {
  waitForConnection: async function () {
    await new Promise((resolve, reject) => {
      if (!connected || _.isNil(global.client)) {
        global.client.on('connected', function (address, port) {
          connected = true

          try {
            sinon.stub(global.commons, 'sendMessage')
            sinon.stub(global.commons, 'timeout')
            sinon.stub(global.events, 'fire')
            sinon.stub(global.log, 'info')
          } catch (e) { }

          resolve(true)
        })
        setTimeout(() => reject(new Error('Not connected in specified time')), 20000)
      } else {
        resolve(true)
      }
    })
  }
}
