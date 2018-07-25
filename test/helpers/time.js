module.exports = {
  waitMs: async function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
