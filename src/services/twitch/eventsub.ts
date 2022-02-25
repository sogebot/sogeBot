import crypto from 'crypto';

import { MINUTE } from '@sogebot/ui-helpers/constants';
import axios from 'axios';
import type { Request, Response } from 'express';
import localtunnel from 'localtunnel';
import type QueryString from 'qs';
import { v4 } from 'uuid';

import emitter from '../../helpers/interfaceEmitter.js';

import * as channelPoll from '~/helpers/api/channelPoll';
import * as channelPrediction from '~/helpers/api/channelPrediction';
import * as hypeTrain from '~/helpers/api/hypeTrain';
import { TokenError } from '~/helpers/errors';
import { eventEmitter } from '~/helpers/events';
import { follow } from '~/helpers/events/follow';
import {
  debug,
  error, info, warning,
} from '~/helpers/log';
import { ioServer } from '~/helpers/panel';
import { variables } from '~/watchers';

export const eventErrorShown = new Set<string>();

const messagesProcessed: string[] = [];
let isErrorEventsShown = false;
let isErrorSetupShown = false;

const events = {
  'channel.hype_train.begin': (res: Response<any, Record<string, any>>) => {
    hypeTrain.setIsStarted(true);
    hypeTrain.setCurrentLevel(1);
    eventEmitter.emit('hypetrain-started');
    res.status(200).send('OK');
  },
  'channel.hype_train.progress': (res: Response<any, Record<string, any>>, data: any) => {
    hypeTrain.setIsStarted(true);
    hypeTrain.setTotal(data.event.total);
    hypeTrain.setGoal(data.event.goal);
    for (const top of data.event.top_contributions) {
      hypeTrain.setTopContributions(top.type, top.total, top.user_id, top.user_login);
    }
    hypeTrain.setLastContribution(data.event.last_contribution.total, data.event.last_contribution.type, data.event.last_contribution.user_id, data.event.last_contribution.user_login);
    hypeTrain.setCurrentLevel(data.event.level);

    // update overlay
    ioServer?.of('/services/twitch').emit('hypetrain-update', {
      total: data.event.total, goal: data.event.goal, level: data.event.level, subs: Object.fromEntries(hypeTrain.subs),
    });

    res.status(200).send('OK');
  },
  'channel.hype_train.end': (res: Response<any, Record<string, any>>, data: any) => {
    hypeTrain.triggerHypetrainEnd().then(() => {
      hypeTrain.setTotal(0);
      hypeTrain.setGoal(0);
      hypeTrain.setLastContribution(0, 'bits', null, null);
      hypeTrain.setTopContributions('bits', 0, null, null);
      hypeTrain.setTopContributions('subs', 0, null, null);
      hypeTrain.setCurrentLevel(1);
      ioServer?.of('/services/twitch').emit('hypetrain-end');
      res.status(200).send('OK');
    });
  },
  'channel.follow': (res: Response<any, Record<string, any>>, data: any) => {
    follow(data.event.user_id, data.event.user_login, data.event.followed_at);
    res.status(200).send('OK');
  },
  'channel.poll.begin': (res: Response<any, Record<string, any>>, data: any) => {
    channelPoll.setData(data.event);
    channelPoll.triggerPollStart().then(() => {
      res.status(200).send('OK');
    });
  },
  'channel.poll.progress': (res: Response<any, Record<string, any>>, data: any) => {
    channelPoll.setData(data.event);
    res.status(200).send('OK');
  },
  'channel.poll.end': (res: Response<any, Record<string, any>>, data: any) => {
    channelPoll.setData(data.event);
    channelPoll.triggerPollEnd().then(() => {
      res.status(200).send('OK');
    });
  },
  'channel.prediction.begin': (res: Response<any, Record<string, any>>, data: any) => {
    channelPrediction.set(data.event);
    channelPrediction.start();
    res.status(200).send('OK');
  },
  'channel.prediction.progress': (res: Response<any, Record<string, any>>, data: any) => {
    channelPrediction.set(data.event);
    res.status(200).send('OK');
  },
  'channel.prediction.lock': (res: Response<any, Record<string, any>>, data: any) => {
    channelPrediction.lock();
    res.status(200).send('OK');
  },
  'channel.prediction.end': (res: Response<any, Record<string, any>>, data: any) => {
    channelPrediction.end(data.event.winning_outcome_id);
    res.status(200).send('OK');
  },
};

class EventSub {
  tunnelDomain = '';

  async handler(req: Request<Record<string, any>, any, any, QueryString.ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>) {
    const secret = variables.get('services.twitch.secret') as string;
    if (req.headers['sogebot-test'] || messagesProcessed.includes(String(req.header('twitch-eventsub-message-id')))) {
      // testing for UI and if message is already processed
      return res.status(200).send('OK');
    }
    messagesProcessed.unshift(String(req.header('twitch-eventsub-message-id')));
    messagesProcessed.length = 50;

    // check if its from twitch
    const hmac_message = String(req.headers['twitch-eventsub-message-id'])
      + String(req.headers['twitch-eventsub-message-timestamp']) + (req as any).rawBody;
    const signature = crypto.createHmac('SHA256', secret).update(hmac_message).digest('hex');
    const expected_signature_header = 'sha256=' + signature;

    if (req.headers['twitch-eventsub-message-signature'] !== expected_signature_header) {
      res.status(403).send('Forbidden');
    } else {
      if (req.header('twitch-eventsub-message-type') === 'webhook_callback_verification') {
        info(`EVENTSUB: ${req.header('twitch-eventsub-subscription-type')} is verified.`);
        const enabledSubscriptions = variables.get('services.twitch.eventSubEnabledSubscriptions') as string[];
        if (!enabledSubscriptions.includes(String(req.header('twitch-eventsub-subscription-type')))) {
          enabledSubscriptions.push(String(req.header('twitch-eventsub-subscription-type')));
        }
        res.status(200).send(req.body.challenge); // lgtm [js/reflected-xss]
      } else if (req.header('twitch-eventsub-message-type') === 'notification') {
        const data = req.body;

        if ((events as any)[data.subscription.type]) {
          (events as any)[data.subscription.type](res, data);
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
    const appToken = variables.get('services.twitch.appToken') as string;
    const clientId = variables.get('services.twitch.eventSubClientId') as string;
    const clientSecret = variables.get('services.twitch.eventSubClientSecret') as string;
    if (appToken.length > 0) {
      // validate
      try {
        const validateUrl = `https://id.twitch.tv/oauth2/validate`;
        const response = await axios.get<any>(validateUrl, { headers: { Authorization: `OAuth ${appToken}` } });
        if (response.data.client_id !== clientId) {
          warning(`EVENTSUB: Client ID of token and set Client ID not match. Invalidating token.`);
          emitter.emit('set', '/services/twitch', 'appToken', '');
        } else {
          return appToken;
        }
      } catch (e: any) {
        error(e.stack);
      }
    }

    if (clientId.length > 0 && clientSecret.length > 0) {
      try {
        const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials&scope=channel:read:hype_train`;
        const request = await axios.post<any>(url);
        emitter.emit('set', '/services/twitch', 'appToken', request.data.access_token);
        return request.data.access_token;
      } catch (e: any) {
        if (e.response) {
          // Request made and server responded
          throw new TokenError(`Token call returned ${e.response.data.status} - ${e.response.data.message}`);
        }
        throw new TokenError(`Something went wrong during token call - ${e.stack}`);
      }
    } else {
      return null;
    }
  }

  constructor() {
    setInterval(() => this.onStartup(), MINUTE / 2);

    emitter.on('services::twitch::eventsub', (req, res) => {
      this.handler(req,res);
    });

    emitter.on('change', (path, value) => {
      if (path.includes('services') && path.includes('twitch')) {
        if (path.includes('useTunneling')
        || path.includes('domain')
        || path.includes('eventSubClientId')
        || path.includes('eventSubClientSecret')) {
          this.onStartup();
        }
      }
    });
  }

  async onStartup() {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const clientId = variables.get('services.twitch.eventSubClientId') as string;
    const useTunneling = variables.get('services.twitch.useTunneling') as string;
    const domain = variables.get('services.twitch.domain') as string;
    let secret = variables.get('services.twitch.secret') as string;

    if (useTunneling) {
      if (this.tunnelDomain.length === 0) {
        const tunnel = await localtunnel({ port: Number(process.env.PORT ?? 20000) });
        this.tunnelDomain = tunnel.url;

        tunnel.on('error', () => {
          info(`EVENTSUB: Something went wrong during tunneling, retrying.`);
          this.tunnelDomain = '';
        });
        info(`EVENTSUB: (Unreliable) Tunneling through ${this.tunnelDomain}`);
      }
    } else if(domain.length === 0) {
      if (!isErrorSetupShown) {
        info(`EVENTSUB: Domain or unreliable tunneling not set, please set it in UI.`);
        isErrorSetupShown = true;
      }
      emitter.emit('set', '/services/twitch', 'eventSubEnabledSubscriptions', []);
      return;
    }

    if (secret.length === 0) {
      secret = v4();
      emitter.emit('set', '/services/twitch', 'secret', secret);
    }

    try {
      // check if domain is available in https mode
      await axios.get<any>(`${useTunneling ? this.tunnelDomain : 'https://' + domain}/webhooks/callback`, { headers: { 'sogebot-test': 'true' } });
    } catch (e) {
      if (!isErrorEventsShown) {
        warning(`EVENTSUB: Bot not responding correctly on ${useTunneling ? this.tunnelDomain : 'https://' + domain}/webhooks/callback, eventsub will not work.`);
        if (e instanceof Error) {
          warning(e.stack);
        }
        isErrorEventsShown = true;
      }
      emitter.emit('set', '/services/twitch', 'eventSubEnabledSubscriptions', []);
      return;
    }

    try {
      isErrorEventsShown = false;
      isErrorSetupShown = false;
      const token = await this.generateAppToken();

      if (!token) {
        emitter.emit('set', '/services/twitch', 'eventSubEnabledSubscriptions', []);
        return;
      }
      const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
      const request = await axios.get<any>(url, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     clientId,
        },
        timeout: 20000,
      });

      const eventsList = [
        'channel.follow',
        'channel.hype_train.begin',
        'channel.hype_train.progress',
        'channel.hype_train.end',
        'channel.poll.begin',
        'channel.poll.progress',
        'channel.poll.end',
        'channel.prediction.begin',
        'channel.prediction.progress',
        'channel.prediction.lock',
        'channel.prediction.end',
      ];

      emitter.emit('set', '/services/twitch', 'eventSubEnabledSubscriptions', []);

      for (const event of eventsList) {
        const enabledOrPendingEvents = request.data.data.find((o: any) => {
          return o.type === event
            && ['webhook_callback_verification_pending', 'enabled'].includes(o.status)
            && o.condition.broadcaster_user_id === broadcasterId;
        });

        if (enabledOrPendingEvents) {
          // check if domain is same
          if (enabledOrPendingEvents.transport.callback !== `${useTunneling ? this.tunnelDomain : 'https://' + domain}/webhooks/callback`) {
            info(`EVENTSUB: ${event} callback endpoint doesn't match domain, revoking.`);
            try {
              await axios.delete(`${url}?id=${enabledOrPendingEvents.id}`, {
                headers: {
                  'Authorization': 'Bearer ' + token,
                  'Client-ID':     clientId,
                },
                timeout: 20000,
              });
            } catch (e) {
              if (e instanceof Error) {
                debug('eventsub', e.stack);
              }
            }
            setTimeout(() => {
              this.onStartup();
            }, 5000);
            return;
          } else {
            const enabledSubscriptions = variables.get('services.twitch.eventSubEnabledSubscriptions') as string[];
            if (!enabledSubscriptions.includes(event)) {
              info(`EVENTSUB: Subscribed to ${event}.`);
              enabledSubscriptions.push(event);
            }
            emitter.emit('set', '/services/twitch', 'eventSubEnabledSubscriptions', enabledSubscriptions);
          }
        }

        if (!enabledOrPendingEvents) {
          await this.subscribe(event);
        }
      }
    } catch (e: any) {
      error(e);
    }
  }

  async subscribe(event: string) {
    const clientId = variables.get('services.twitch.eventSubClientId') as string;
    const useTunneling = variables.get('services.twitch.useTunneling') as string;
    const secret = variables.get('services.twitch.secret') as string;
    const domain = variables.get('services.twitch.domain') as string;
    if (eventErrorShown.has(event)) {
      return;
    }

    try {
      const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
      info('EVENTSUB: sending subscribe event for ' + event);
      const token = await this.generateAppToken();
      const url = 'https://api.twitch.tv/helix/eventsub/subscriptions';
      await axios({
        url,
        method:  'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     clientId,
        },
        data: {
          'type':      event,
          'version':   '1',
          'condition': { 'broadcaster_user_id': broadcasterId },
          'transport': {
            'method':   'webhook',
            'callback': `${useTunneling ? this.tunnelDomain : 'https://' + domain}/webhooks/callback`,
            'secret':   secret,
          },
        },
        timeout: 20000,
      });
      eventErrorShown.delete(event);
    } catch (e: any) {
      if (e instanceof TokenError) {
        error(`EVENTSUB: ${e.stack}`);
      } else {
        if (!eventErrorShown.has(event)) {
          if (e.response.status === 403) {
            error(`EVENTSUB: ${event} subscription is not properly authorized, please authorize yourself in UI.`);
          } else {
            error(`EVENTSUB: Something went wrong during event ${event} subscription, please authorize yourself in UI.`);
            error(e.message);
          }
          eventErrorShown.add(event);
        }
      }
    }
  }
}

export default EventSub;