const getSymbolFromCurrency = require('currency-symbol-map')
const axios = require('axios')
const _ = require('lodash')
const debug = require('debug')

class Currency {
  constructor () {
    this.timeouts = {}

    this.base = 'CZK'
    this.rates = {}

    global.configuration.register('currency', 'core.no-response', 'string', 'EUR')

    this.updateRates()
  }

  isCodeSupported (code) {
    return code === this.base || !_.isNil(this.rates[code])
  }

  symbol (code) {
    return getSymbolFromCurrency(code)
  }

  exchange (value, from, to) {
    try {
      value = parseFloat(value)
      this.rates[this.base] = 1 // base is always 1:1

      if (from.toLowerCase().trim() === to.toLowerCase().trim()) return value // nothing to do
      if (_.isNil(this.rates[from])) throw Error(`${from} code was not found`)
      if (_.isNil(this.rates[to]) && to.toLowerCase().trim() !== this.base.toLowerCase().trim()) throw Error(`${to} code was not found`)

      if (to.toLowerCase().trim() !== this.base.toLowerCase().trim()) {
        return parseFloat((value * this.rates[from]) / this.rates[to])
      } else {
        return parseFloat(value * this.rates[from])
      }
    } catch (e) {
      global.log.warning(`Currency exchange error - ${e.message}`)
      return parseFloat(value) // don't change rate if code not found
    }
  }

  async updateRates () {
    clearTimeout(this.timeouts['updateRates'])

    let refresh = 1000 * 60 * 60 * 24
    try {
      // base is always CZK
      const result = await axios.get('http://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt')
      let linenum = 0
      for (let line of result.data.toString().split('\n')) {
        if (linenum < 2 || line.trim().length === 0) {
          linenum++
          continue
        }
        let [country, name, count, code, rate] = line.split('|')
        debug('currency:updateRates')([country, name, count, code, rate])
        this.rates[code] = parseFloat(rate.replace(',', '.') / count).toFixed(3)
      }
    } catch (e) {
      console.error(e.stack)
      refresh = 1000
    }

    this.timeouts['updateRates'] = setTimeout(() => this.updateRates(), refresh)
  }
}

module.exports = Currency
