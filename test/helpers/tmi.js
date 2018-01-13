var connected = false

module.exports = {
  waitForConnection: async function () {
    await new Promise((resolve, reject) => {
      if (!connected) {
        global.client.on('connected', function (address, port) {
          connected = true
          resolve(true)
        })
        setTimeout(() => reject(new Error('Not connected in specified time')), 3000)
      } else resolve(true)
    })
  }
}
