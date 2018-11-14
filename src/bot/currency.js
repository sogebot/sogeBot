// @flow

'use strict'

const getSymbolFromCurrency = require('currency-symbol-map')
const axios = require('axios')
const _ = require('lodash')
const chalk = require('chalk')
const constants = require('./constants')

const Core = require('./_interface')

class Currency extends Core {
  rates: RatesObject = {}
  timeouts: Object = {}
  base: string = 'CZK'
  constructor () {
    const settings = {
      currency: {
        mainCurrency: 'EUR'
      }
    }
    const ui = {
      currency: {
        mainCurrency: {
          type: 'selector',
          values: ['USD', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TRY', 'ZAR']
        }
      }
    }
    super({ settings, ui })

    setTimeout(() => this.updateRates(), 5 * constants.SECOND)
  }

  isCodeSupported (code: string) {
    return code === this.base || !_.isNil(this.rates[code])
  }

  symbol (code: string) {
    return getSymbolFromCurrency(code)
  }

  exchange (value: number, from: string, to: string) {
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

    let refresh = constants.DAY
    try {
      global.log.info(chalk.yellow('CURRENCY:') + ' fetching rates')
      // base is always CZK
      const result = await axios.get('http://www.cnb.cz/cs/financni_trhy/devizovy_trh/kurzy_devizoveho_trhu/denni_kurz.txt')
      let linenum = 0
      for (let line of result.data.toString().split('\n')) {
        if (linenum < 2 || line.trim().length === 0) {
          linenum++
          continue
        }
        line = line.split('|')
        let count = line[2]
        let code = line[3]
        let rate = line[4]
        this.rates[code] = parseFloat(rate.replace(',', '.') / count).toFixed(3)
      }
      global.log.info(chalk.yellow('CURRENCY:') + ' fetched rates')
    } catch (e) {
      global.log.error(e.stack)
      refresh = constants.SECOND
    }

    this.timeouts['updateRates'] = setTimeout(() => this.updateRates(), refresh)
  }
}

module.exports = Currency
