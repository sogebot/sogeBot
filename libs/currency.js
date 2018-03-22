const getSymbolFromCurrency = require('currency-symbol-map')
const snekfetch = require('snekfetch')
const _ = require('lodash')

class Currency {
  constructor () {
    this.base = 'USD'
    this.rates = {}

    global.configuration.register('currency', 'core.no-response', 'string', 'EUR')

    this.updateRates()
  }

  symbol (code) {
    return getSymbolFromCurrency(code)
  }

  exchange (value, from, to) {
    try {
      this.rates[this.base] = 1 // base is always 1:1

      if (from.toLowerCase().trim() === to.toLowerCase().trim()) return value // nothing to do
      if (_.isNil(this.rates[from])) throw Error(`${from} code was not found`)
      if (_.isNil(this.rates[to]) && to.toLowerCase().trim() !== this.base.toLowerCase().trim()) throw Error(`${to} code was not found`)

      if (to.toLowerCase().trim() !== this.base.toLowerCase().trim()) {
        return (value / this.rates[from]) * this.rates[to]
      } else return value / this.rates[from]
    } catch (e) {
      global.log.warning(`Currency exchange error - ${e.message}`)
      return value // don't change rate if code not found
    }
  }

  async updateRates () {
    let refresh = 1000 * 60 * 60 * 24
    try {
      const result = await snekfetch.get(`http://api.fixer.io/latest?base=${this.base}`)
      this.rates = result.body.rates
    } catch (e) {
      console.error(e.stack)
      refresh = 1000
    }
    setTimeout(() => this.updateRates(), refresh) // update rates once per day
  }
}

module.exports = Currency
