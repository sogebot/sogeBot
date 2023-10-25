import fs from 'fs'
import axios from 'axios'

const appId = process.env.OPENEXCHANGE_APPID;
const ratesFile = './src/helpers/currency/rates.ts';

axios.get('https://openexchangerates.org/api/latest.json?app_id=' + appId)
  .then(res => {
    const rates = res.data.rates;
    fs.writeFileSync(ratesFile, `export default ${JSON.stringify(rates, null, 2)};`);
    console.log('Rates fetched OK!');
  })
  .catch(err => console.error(err.response.data));