import { Currency, UserTip, UserTipInterface } from '@entity/user.js';
import * as constants from '@sogebot/ui-helpers/constants.js';
import axios from 'axios';
import chalk from 'chalk';

import Integration from './_interface.js';
import { onStartup } from '../decorators/on.js';
import { persistent, settings } from '../decorators.js';
import eventlist from '../overlays/eventlist.js';
import alerts from '../registries/alerts.js';
import users from '../users.js';

import { AppDataSource } from '~/database.js';
import { isStreamOnline, stats } from '~/helpers/api/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/index.js';
import rates from '~/helpers/currency/rates.js';
import { eventEmitter } from '~/helpers/events/index.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/triggers.js';
import {
  error, info, tip,
} from '~/helpers/log.js';
import { adminEndpoint } from '~/helpers/socket.js';

const parsedTips: number[] = [];

type DonationAlertsResponse = {
  'data': {
    'id': number,
    'name': string,
    'username': string,
    'message': string,
    'amount': number,
    'currency': Currency,
    'is_shown': number,
    'created_at': string /* 2019-09-29 09:00:00 */,
    'shown_at': null
  }[],
  'links': {
    'first': string,
    'last': string,
    'prev': null | string,
    'next': null | string
  },
  'meta': {
    'current_page': number,
    'from': number,
    'last_page': number,
    'path': 'https://www.donationalerts.com/api/v1/alerts/donations',
    'per_page': number,
    'to': number,
    'total': number,
  }
};

function getTips (page: number, jwtToken: string, afterDate: number): Promise<[last_page: number, tips: DonationAlertsResponse['data']]> {
  return new Promise((resolve, reject) => {
    axios.get<DonationAlertsResponse>(`https://www.donationalerts.com/api/v1/alerts/donations?page=${page}`, {
      headers: {
        Accept:        'application/json',
        Authorization: 'Bearer ' + jwtToken,
      },
    }).then(response => {
      const data = response.data;
      // check if we are at afterDate
      const tips = data.data.filter(o => new Date(o.created_at).getTime() > afterDate);
      if (tips.length < data.data.length) {
        resolve([1, tips]);
      } else {
        resolve([Number(data.meta.last_page), data.data]);
      }
    }).catch(e => reject(e));
  });
}

class Donationalerts extends Integration {
  @persistent()
    afterDate = 0;

  isRefreshing = false;

  @settings()
    channel = '';

  @settings()
    access_token = '';

  @settings()
    refresh_token = '';

  @onStartup()
  interval() {
    setInterval(async () => {
      if (this.channel.length === 0 || !this.enabled) {
        return;
      }

      try {
        // get initial data
        let [last_page, tips] = await getTips(1, this.access_token, this.afterDate);

        if (last_page > 1) {
          for(let page = 2; page <= last_page; page++) {
            const data = await getTips(page, this.access_token, this.afterDate);
            last_page = data[0];
            tips = [...tips, ...data[1]];
          }
        }
        for (const item of tips) {
          this.parse(item);
        }

        if (tips.length > 0) {
          this.afterDate = new Date(tips[0].created_at).getTime();
        }
      } catch (e) {
        this.refresh();
      }
    }, 10 * constants.SECOND);
  }

  refresh() {
    if (this.isRefreshing) {
      return;
    }
    if (this.refresh_token.length > 0) {
      this.isRefreshing = true;
      // get new refresh and access token
      axios.request<{
        'token_type': 'Bearer',
        'access_token': string,
        'expires_in': number,
        'refresh_token': string,
      }>({
        url:     'https://credentials.sogebot.xyz/donationalerts',
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        data:    { refreshToken: this.refresh_token },
      }).then((response) => {
        this.refresh_token = response.data.refresh_token;
        this.access_token = response.data.access_token;
        info(chalk.yellow('DONATIONALERTS:') + ' Access token refreshed.');
      }).catch((e) => {
        error(chalk.yellow('DONATIONALERTS:') + ' Bot was unable to refresh access token. Please recreate your tokens.');
        error(e.stack);
        this.channel = '';
        this.access_token = '';
        this.refresh_token = '';
      }).finally(() => {
        this.isRefreshing = false;
      });
    } else {
      error(chalk.yellow('DONATIONALERTS:') + ' Bot was unable to refresh access token. Please recreate your tokens.');
      error(chalk.yellow('DONATIONALERTS:') + ' No refresh token');
      this.channel = '';
      this.access_token = '';
      this.refresh_token = '';
    }
  }

  sockets() {
    adminEndpoint('/integrations/donationalerts', 'donationalerts::validate', (token, cb) => {
      axios('https://www.donationalerts.com/api/v1/alerts/donations', {
        method:  'GET',
        headers: {
          Accept:        'application/json',
          Authorization: 'Bearer ' + token,
        },
      }).then(() => {
        cb(null);
      }).catch((e: unknown) => cb(e as Error));
    });
    adminEndpoint('/integrations/donationalerts', 'donationalerts::revoke', async (cb) => {
      self.channel = '';
      self.refresh_token = '';
      self.access_token = '';
      info(`DONATIONALERTS: User access revoked.`);
      cb(null);
    });
    adminEndpoint('/integrations/donationalerts', 'donationalerts::token', async (tokens, cb) => {
      self.access_token = tokens.accessToken;
      self.refresh_token = tokens.refreshToken;
      await this.connect();
      cb(null);
    });
  }

  @onStartup()
  async connect () {
    if (this.access_token.trim() === '') {
      this.channel = '';
      return;
    }

    try {
      const request = await axios.get<any>('https://www.donationalerts.com/api/v1/user/oauth', { headers: { 'Authorization': `Bearer ${this.access_token}` } });
      this.channel = request.data.data.name,
      info(chalk.yellow('DONATIONALERTS:') + ` Access token check OK. Using channel ${this.channel}`);
    } catch (e) {
      error(chalk.yellow('DONATIONALERTS:') + ' Access token is not valid.');
      this.channel = '';
      return;
    }
  }

  async parse(data: DonationAlertsResponse['data'][number]) {
    // we will save id to not parse it twice (websocket shenanigans may happen)
    if (parsedTips.includes(data.id)) {
      return;
    } else {
      parsedTips.unshift(data.id);
      parsedTips.length = 20;
    }

    const timestamp = Date.now();
    const isAnonymous = data.username === '' || data.username === null ;

    if (!isAnonymous) {
      const user = await users.getUserByUsername(data.username);
      tip(`${data.username.toLowerCase()}${user.userId ? '#' + user.userId : ''}, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);

      eventlist.add({
        event:    'tip',
        amount:   data.amount,
        currency: data.currency,
        userId:   String(await users.getIdByName(data.username.toLowerCase()) ?? '0'),
        message:  data.message,
        timestamp,
      });

      eventEmitter.emit('tip', {
        isAnonymous:         false,
        userName:            data.username.toLowerCase(),
        amount:              data.amount.toFixed(2),
        currency:            data.currency,
        amountInBotCurrency: Number(exchange(Number(data.amount), data.currency, mainCurrency.value)).toFixed(2),
        currencyInBot:       mainCurrency.value,
        message:             data.message,
      });

      alerts.trigger({
        event:      'tip',
        service:    'donationalerts',
        name:       data.username.toLowerCase(),
        amount:     Number(data.amount.toFixed(2)),
        tier:       null,
        currency:   data.currency,
        monthsName: '',
        message:    data.message,
      });

      const newTip: UserTipInterface = {
        amount:        Number(data.amount),
        currency:      data.currency,
        sortAmount:    exchange(Number(data.amount), data.currency, mainCurrency.value),
        message:       data.message,
        tippedAt:      timestamp,
        exchangeRates: rates,
        userId:        user.userId,
      };
      AppDataSource.getRepository(UserTip).save(newTip);
    } else {
      tip(`anonymous#__anonymous__, amount: ${Number(data.amount).toFixed(2)}${data.currency}, message: ${data.message}`);
      alerts.trigger({
        event:      'tip',
        name:       'anonymous',
        amount:     Number(data.amount.toFixed(2)),
        tier:       null,
        currency:   data.currency,
        monthsName: '',
        message:    data.message,
      });
      eventlist.add({
        event:    'tip',
        amount:   data.amount,
        currency: data.currency,
        userId:   `anonymous#__anonymous__`,
        message:  data.message,
        timestamp,
      });
    }
    triggerInterfaceOnTip({
      userName: isAnonymous ? 'anonymous' : data.username.toLowerCase(),
      amount:   data.amount,
      message:  data.message,
      currency: data.currency,
      timestamp,
    });
    if (isStreamOnline.value) {
      stats.value.currentTips = stats.value.currentTips + Number(exchange(data.amount, data.currency, mainCurrency.value));
    }
  }
}

const self = new Donationalerts();
export default self;
