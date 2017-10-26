module.exports = {
  cleanup: async function () {
    let items = await global.db.engine.find('alias')
    for (let item of items) {
      await global.db.engine.remove('alias', { alias: item.alias })
      global.parser.unregister(item.alias)
    }
    items = await global.db.engine.find('commands')
    for (let item of items) {
      await global.db.engine.remove('commands', { command: item.command })
      global.parser.unregister(item.command)
    }

    await global.db.engine.remove('keywords', {})
    await global.db.engine.remove('settings', {})
    await global.db.engine.remove('timers', {})
    await global.db.engine.remove('timersResponses', {})
    await global.db.engine.remove('users', {})
    await global.db.engine.remove('cooldowns', {})
  }
}
