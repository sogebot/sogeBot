module.exports = {
  cleanup: async function (table) {
    await global.db.engine.remove(table, {})
  }
}
