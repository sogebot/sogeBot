import { Mutex } from 'async-mutex';
import fetch from 'node-fetch';
import { z } from 'zod';

import Integration from './_interface.js';
import { command, persistent, settings } from '../decorators.js';

import { Get, Post } from '~/decorators/endpoint.js';
import { onStartup } from '~/decorators/on.js';
import { prepare } from '~/helpers/commons/index.js';
import { triggerInterfaceOnTip } from '~/helpers/interface/index.js';
import { getLang } from '~/helpers/locales.js';
import { error, info, tip } from '~/helpers/log.js';
import eventlist from '~/overlays/eventlist.js';
import alerts from '~/registries/alerts.js';

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

  campaigns: {
    id: number,
    name: string,
    slug: string,
    startsAt: number,
    endsAt: null | number,
    description: string,
    causeId: number,
    originalFundraiserGoal: number,
    fundraiserGoalAmount: number,
    supportingAmountRaised: number,
    amountRaised: number,
    supportable: boolean,
    status: 'published',
    type: 'Event',
    avatar: {
      src: string,
      alt: string,
      width: number,
      height: number,
    },
    livestream: {
      type: 'twitch',
      channel: string,
    } | null,
    causeCurrency: 'USD',
    totalAmountRaised: 0,
    user: {
      id: number,
      username: string,
      slug: string,
      url: string,
      avatar: {
        src: string,
        alt: string,
        width: number,
        height: number,
      },
    },
    regionId: null,
    metadata: Record<string, unknown>,
  }[] = [];
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
            info(`TILTIFY: Successfully fetched campaigns and donations.`);
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
    const response = await fetch(`https://tiltify.com/api/v3/users/${this.userId}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
      },
    });
    if (response.status !== 200) {
      throw new Error(`TILTIFY: Error during fetching campaigns. Status: ${response.status}`);
    }
    this.campaigns = (await response.json() as any).data;
  }

  async getDonations() {
    for (const campaign of this.campaigns) {
      const response = await fetch(`https://tiltify.com/api/v3/campaigns/${campaign.id}/donations`, {
        headers: {
          'Authorization': `Bearer ${this.access_token}`,
        },
      });
      if (response.status !== 200) {
        throw new Error(`TILTIFY: Error during fetching donations. Status: ${response.status}`);
      }
      const data = (await response.json() as any).data as {
        'id': number,
        'amount': number,
        'name': string,
        'comment': string,
        'completedAt': number,
        'rewardId': number,
      }[];

      for (const donate of data) {
        if (this.lastCheckAt < donate.completedAt) {
          tip(`${donate.name} for ${campaign.name}, amount: ${Number(donate.amount).toFixed(2)}${campaign.causeCurrency}, message: ${donate.comment}`);
          const eventData = await eventlist.add({
            event:               'tip',
            amount:              donate.amount,
            currency:            campaign.causeCurrency,
            userId:              `${donate.name}#__anonymous__`,
            message:             donate.comment,
            timestamp:           donate.completedAt,
            charityCampaignName: campaign.name,
          });
          alerts.trigger({
            eventId:    eventData?.id ?? null,
            event:      'tip',
            service:    'tiltify',
            name:       donate.name,
            amount:     Number(donate.amount.toFixed(2)),
            tier:       null,
            currency:   campaign.causeCurrency,
            monthsName: '',
            message:    donate.comment,
          });
          triggerInterfaceOnTip({
            userName:  donate.name,
            amount:    donate.amount,
            message:   donate.comment,
            currency:  campaign.causeCurrency,
            timestamp: donate.completedAt,
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
    const response = await fetch(`https://tiltify.com/api/v3/user`, {
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
      responses.push(`${responses.length+1}. ${campaign.name} - ${campaign.amountRaised.toLocaleString(getLang(), { style: 'currency', currency: campaign.causeCurrency })} of ${campaign.fundraiserGoalAmount.toLocaleString(getLang(), { style: 'currency', currency: campaign.causeCurrency })} => ${campaign.user.url}/${campaign.slug}`);
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
