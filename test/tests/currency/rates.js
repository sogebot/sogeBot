/* global describe it before */
const {
  isMainThread
} = require('worker_threads');
if (!isMainThread) process.exit()


require('../../general.js')

const assert = require('chai').assert

describe('Currency - rates check', () => {
  let rates = {
    AUD: '16.065',
    BRL: '5.893',
    BGN: '13.206',
    CNY: '3.344',
    DKK: '3.459',
    EUR: '25.830',
    PHP: '0.445',
    HKD: '2.947',
    HRK: '3.482',
    INR: '0.333',
    IDR: '0.002',
    ISK: '0.186',
    ILS: '6.363',
    JPY: '0.213',
    ZAR: '1.586',
    CAD: '17.109',
    KRW: '0.020',
    HUF: '0.080',
    MYR: '5.522',
    MXN: '1.168',
    XDR: '31.814',
    NOK: '2.642',
    NZD: '15.159',
    PLN: '6.030',
    RON: '5.452',
    RUB: '0.353',
    SGD: '16.852',
    SEK: '2.433',
    CHF: '23.140',
    THB: '0.735',
    TRY: '3.925',
    USD: '23.093',
    GBP: '29.147'
  }

  before(async () => {
    global.currency.rates = rates;
  })

  describe('rates should be correctly calculated between each other', () => {
    for (let base of Object.keys(rates)) {
      before(() => {
        global.currency.base = base
      })
      it(`Checking if all rates are correctly computed with '${base}' as base`, async () => {
        for (let to of Object.keys(rates)) {
          for (let from of Object.keys(rates)) {
            if (from === to) {
              assert.strictEqual(global.currency.exchange(1, from, to), 1)
            } else {
              assert.notEqual(global.currency.exchange(1, from, to), 1)
            }
          }
        }
      })
    }
  })
})
