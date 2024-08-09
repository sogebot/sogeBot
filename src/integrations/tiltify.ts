import { Mutex } from 'async-mutex';
import fetch from 'node-fetch';
import { z } from 'zod';

import Integration from './_interface.js';
import { command, persistent, settings } from '../decorators.js';

import { Currency } from '~/database/entity/user.js';
import { Get, Post } from '~/decorators/endpoint.js';
import { onStartup } from '~/decorators/on.js';
import { prepare } from '~/helpers/commons/index.js';
import exchange from '~/helpers/currency/exchange.js';
import { mainCurrency } from '~/helpers/currency/mainCurrency.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/index.js';
import { getLang } from '~/helpers/locales.js';
import { error, info, tip } from '~/helpers/log.js';
import eventlist from '~/overlays/eventlist.js';
import alerts from '~/registries/alerts.js';
import { tiltifyCampaign } from '../../d.ts/src/helpers/socket.js';

const mutex = new Mutex();

class Tiltify extends Integration {
  @settings(undefined, false, true)
    access_token = '';
  @settings()
    userName = '';
  @settings()
    userId = '';

  @persistent()
    lastCheckAt = Date.now();

  fundraising_events: {
    avatar: {
      alt: string
      height: number
      src: string
      width: number
    }
    can_publish_supporting_at: string
    cause_id: string
    currency_code: string
    description: string
    donate_url: string
    end_supporting_at: string
    ends_at: string
    goal: {
      currency: string
      value: string
    }
    id: string
    inserted_at: string
    legacy_id: number
    name: string
    published_at: string
    retired_at: any
    slug: string
    start_supporting_at: string
    starts_at: string
    status: string
    total_amount_raised: {
      currency: string
      value: string
    }
    updated_at: string
    url: string
  }[] = [];
  campaigns: tiltifyCampaign[] = [];
  donations: Record<number,
  {
    'id': number,
    'amount': number,
    'name': string,
    'comment': string,
    'completedAt': number,
    'rewardId': number,
  }> = {};

  @onStartup()
  onStartup() {
    if (this.access_token.length > 0 && this.userName.length > 0 && String(this.userId).length > 0) {
      info(`TILTIFY: Logged in as ${this.userName}#${this.userId}.`);
    } else {
      info(`TILTIFY: Not logged in.`);
    }

    let loggedError = false;
    setInterval(async () => {
      if (this.enabled) {
        return;
      }
      if (this.access_token.length > 0 && this.userName.length > 0 && String(this.userId).length > 0) {
        const release = await mutex.acquire();
        try {
          await this.getCampaigns();
          await this.getDonations();
          if (loggedError) {
            info(`TILTIFY: Successfully fetched integration events, campaigns and donations.`);
          }
          loggedError = false;
        } catch(e) {
          if (!loggedError) {
            error(e);
            loggedError = true;
          }
        }
        release();
      }
    }, 30000);
  }

  async getCampaigns() {
    const response = await fetch(`https://v5api.tiltify.com/api/public/users/${this.userId}/integration_events`, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
      },
    });
    if (response.status !== 200) {
      throw new Error(`TILTIFY: Error during fetching integration events. Status: ${response.status}`);
    }
    this.campaigns = (await response.json() as any).data;
  }

  async getDonations() {
    const response_c = await fetch(`https://v5api.tiltify.com/api/public/users/${this.userId}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
      },
    });
    if (response_c.status !== 200) {
      throw new Error(`TILTIFY: Error during fetching campaigns. Status: ${response_c.status}`);
    }

    for (const campaign of (await response_c.json() as any).data) {
      const response = await fetch(`https://v5api.tiltify.com/api/public/campaigns/${campaign.id}/donations`, {
        headers: {
          'Authorization': `Bearer ${this.access_token}`,
        },
      });
      if (response.status !== 200) {
        throw new Error(`TILTIFY: Error during fetching donations. Status: ${response.status}`);
      }
      const data = (await response.json() as any).data as {
        amount: {
          currency: string
          value: string
        }
        campaign_id: string
        cause_id: string
        completed_at: string
        donor_comment: string
        donor_name: string
        fundraising_event_id: string
        id: string
        legacy_id: number
        poll_id: string
        poll_option_id: string
        reward_claims: Array<{
          id: string
          quantity: number
          reward_id: string
        }>
        reward_id: string
        sustained: boolean
        target_id: string
        team_event_id: string
      }[];

      for (const donate of data) {
        if (this.lastCheckAt < Number(donate.completed_at)) {
          tip(`${donate.donor_name} for ${campaign.name}, amount: ${Number(donate.amount).toFixed(2)}${campaign.amount_raised.currency}, message: ${donate.donor_comment}`);
          const eventData = await eventlist.add({
            event:               'tip',
            amount:              Number(donate.amount.value),
            currency:            donate.amount.currency,
            userId:              `${donate.donor_name}#__anonymous__`,
            message:             donate.donor_comment,
            timestamp:           new Date(donate.completed_at).getTime(),
            charityCampaignName: campaign.name,
          });
          alerts.trigger({
            eventId:    eventData?.id ?? null,
            event:      'tip',
            service:    'tiltify',
            name:       donate.donor_name,
            amount:     Number(Number(donate.amount.value).toFixed(2)),
            tier:       null,
            currency:   campaign.amount_raised.currency,
            monthsName: '',
            message:    donate.donor_comment,
          });
          triggerInterfaceOnTip({
            userName:  donate.donor_name,
            amount:    Number(donate.amount.value),
            message:   donate.donor_comment,
            currency:  campaign.amount_raised.currency,
            timestamp: new Date(donate.completed_at).getTime(),
          });
        }
      }
    }
  }

  @Post('/', {
    action:      'revoke',
    isSensitive: true,
  })
  async postRevoke(req: any) {
    this.access_token = '';
    this.userName = '';
    this.userId = '';
  }

  @Post('/', {
    action:       'code',
    isSensitive:  true,
    zodValidator: z.object({
      code: z.string(),
    }),
  })
  async postCode(req: any) {
    const token = req.body.code;
    // check if token is working ok
    const response = await fetch(`https://v5api.tiltify.com/api/public/current-user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const user = await response.json() as any;
      this.userName = user.data.username;
      this.userId = user.data.id;
      info(`TILTIFY: Logged in as ${this.userName}#${this.userId}.`);
      self.access_token = token;
    } else {
      error(`TILTIFY: Something went wrong during setting access token. Please retry.`);
      throw new Error('TILTIFY: Something went wrong during setting access token. Please retry.');
    }
  }

  @Get('/campaigns', {
    scope: 'public',
  })
  async getCampaignsEndpoints() {
    return this.campaigns;
  }

  @command('!charity')
  commandCharity(opts: CommandOptions) {
    const responses: string[] = [];
    for (const campaign of this.campaigns) {
      const totalAmountRaised = exchange(Number(campaign.total_amount_raised.value), campaign.total_amount_raised.currency as Currency, mainCurrency.value);
      responses.push(`${responses.length+1}. ${campaign.name} - ${totalAmountRaised.toLocaleString(getLang(), { style: 'currency', currency: campaign.total_amount_raised.currency })} of ${Number(campaign.goal.value).toLocaleString(getLang(), { style: 'currency', currency: campaign.goal.currency })} => ${campaign.user.url}/${campaign.slug}`);
    }
    if (responses.length > 0) {
      return [prepare('integrations.tiltify.active_campaigns'), ...responses].map(response => ({
        response, ...opts,
      }));
    } else {
      return [
        { response: prepare('integrations.tiltify.no_active_campaigns'), ...opts },
      ];
    }
  }
}

const self = new Tiltify();
