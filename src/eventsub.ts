import crypto from 'crypto';

import { MINUTE } from '@sogebot/ui-helpers/constants';
import axios from 'axios';
import type { Request, Response } from 'express';
import type QueryString from 'qs';
import { v4 } from 'uuid';

import Core from './_interface';
import { persistent, settings } from './decorators';
import { onChange, onStartup } from './decorators/on';
import * as hypeTrain from './helpers/api/hypeTrain';
import { eventEmitter } from './helpers/events';
import {
  error, info, warning,
} from './helpers/log';
import { channelId } from './helpers/oauth';

const messagesProcessed: string[] = [];
let isErrorEventsShown = false;

class EventSub extends Core {
  @settings()
  domain = '';
  @settings()
  clientId = '';
  @settings()
  clientSecret = '';
  @persistent()
  appToken = '';
  @persistent()
  secret = '';

  async handler(req: Request<Record<string, any>, any, any, QueryString.ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>) {
    if (req.headers['sogebot-test'] || messagesProcessed.includes(String(req.header('twitch-eventsub-message-id')))) {
      // testing for UI and if message is already processed
      return res.status(200).send('OK');
    }
    messagesProcessed.unshift(String(req.header('twitch-eventsub-message-id')));
    messagesProcessed.length = 50;

    // check if its from twitch
    const hmac_message = String(req.headers['twitch-eventsub-message-id'])
      + String(req.headers['twitch-eventsub-message-timestamp']) + (req as any).rawBody;
    const signature = crypto.createHmac('SHA256', this.secret).update(hmac_message).digest('hex');
    const expected_signature_header = 'sha256=' + signature;

    if (req.headers['twitch-eventsub-message-signature'] !== expected_signature_header) {
      res.status(403).send('Forbidden');
    } else {
      if (req.header('twitch-eventsub-message-type') === 'webhook_callback_verification') {
        info(`EVENTSUB: ${req.header('twitch-eventsub-subscription-type')} is verified.`);
        res.status(200).send(req.body.challenge);
      } else if (req.header('twitch-eventsub-message-type') === 'notification') {
        const data = req.body;
        if (data.subscription.type === 'channel.hype_train.begin') {
          hypeTrain.setCurrentLevel(1);
          eventEmitter.emit('hypetrain-started');
          res.status(200).send('OK');
        } else if (data.subscription.type === 'channel.hype_train.progress') {
          hypeTrain.setTotal(data.event.total);
          hypeTrain.setGoal(data.event.goal);
          for (const top of data.event.top_contributions) {
            hypeTrain.setTopContributions(top.type, top.total, top.user_id, top.user_login);
          }
          hypeTrain.setLastContribution(data.event.last_contribution.total, data.event.last_contribution.type, data.event.last_contribution.user_id, data.event.last_contribution.user_login);
          hypeTrain.setCurrentLevel(data.event.level);
          res.status(200).send('OK');
        } else if (data.subscription.type === 'channel.hype_train.end') {
          await hypeTrain.triggerHypetrainEnd();
          hypeTrain.setTotal(0);
          hypeTrain.setGoal(0);
          hypeTrain.setLastContribution(0, 'bits', null, null);
          hypeTrain.setTopContributions('bits', 0, null, null);
          hypeTrain.setTopContributions('subs', 0, null, null);
          hypeTrain.setCurrentLevel(1);
          res.status(200).send('OK');
        } else {
          error(`EVENTSUB: ${data.subscription.type} not implemented`);
          res.status(400).send('not implemented');
        }
      } else if (req.header('twitch-eventsub-message-type') === 'revocation') {
        info(`EVENTSUB: ${req.header('twitch-eventsub-subscription-type')} revoked. Retrying subscription.`);
        this.subscribe(String(req.header('twitch-eventsub-subscription-type')));
        res.status(200).send('OK');
      }
    }
  }

  async generateAppToken() {
    if (this.appToken.length > 0) {
      // validate
      try {
        const validateUrl = `https://id.twitch.tv/oauth2/validate`;
        await axios.get(validateUrl, { headers: { Authorization: `OAuth ${this.appToken}` } });
        return this.appToken;
      } catch (e) {
        error(e.stack);
      }
    }

    if (this.clientId.length > 0 && this.clientSecret.length > 0) {
      try {
        const url = `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials&scope=channel:read:hype_train`;
        const request = axios.post(url);
        this.appToken = (await request).data.access_token;
        return this.appToken;
      } catch (e) {
        if (e.response) {
          // Request made and server responded
          throw new Error(`Token call returned ${e.response.data.status} - ${e.response.data.message}`);
        }
        throw new Error(`Something wen wrong during token call - ${e.stack}`);
      }
    } else {
      throw new Error('Missing clientId or clientSecret for EventSub');
    }
  }

  @onStartup()
  interval() {
    setInterval(() => this.onStartup(), 10 * MINUTE);
  }

  @onStartup()
  @onChange('clientId')
  @onChange('clientSecret')
  @onChange('domain')
  async onStartup() {
    if (this.secret.length === 0) {
      this.secret = v4();
    }

    if (this.domain.includes('localhost')) {
      if (!isErrorEventsShown) {
        warning('EVENTSUB: you need to set proper domain on 443 port, not localhost, for eventsub.');
        isErrorEventsShown = true;
      }
      return;
    }

    try {
      // check if domain is available in https mode
      await axios.get(`https://${this.domain}/webhooks/callback`, { headers: { 'sogebot-test': 'true' } });
    } catch (e) {
      if (!isErrorEventsShown) {
        warning(`EVENTSUB: Bot not responding correctly on https://${this.domain}/webhooks/callback, eventsub will not work.`);
        isErrorEventsShown = true;
      }
      return;
    }

    try {
      const token = await this.generateAppToken();
      const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
      const request = await axios.get(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     this.clientId,
        },
        timeout: 20000,
      });

      const events = [
        'channel.hype_train.begin',
        'channel.hype_train.progress',
        'channel.hype_train.end',
      ];

      for (const event of events) {
        const enabledOrPendingEvents = request.data.data.find((o: any) => {
          return o.type === event
            && ['webhook_callback_verification_pending', 'enabled'].includes(o.status)
            && o.condition.broadcaster_user_id === channelId.value;
        });
        if (!enabledOrPendingEvents) {
          await this.subscribe(event);
        }
      }
    } catch (e) {
      error(e);
    }
  }

  async subscribe(event: string) {
    try {
      info('EVENTSUB: sending subscribe event for ' + event);
      const token = await this.generateAppToken();
      const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
      await axios({
        url,
        method:  'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     this.clientId,
        },
        data: {
          'type':      event,
          'version':   '1',
          'condition': { 'broadcaster_user_id': channelId.value },
          'transport': {
            'method':   'webhook',
            'callback': `https://${this.domain}/webhooks/callback`,
            'secret':   this.secret,
          },
        },
        timeout: 20000,
      });
    } catch (e) {
      error('EVENTSUB: Something went wrong during event subscription, please authorize yourself on this url and try again.');
      error(`=> https://id.twitch.tv/oauth2/authorize
      ?client_id=${this.clientId}
      &redirect_uri=${this.domain}
      &response_type=token
      &force_verify=true
      &scope=channel:read:hype_train`);
    }
  }
}

const eventsub = new EventSub();
export default eventsub;