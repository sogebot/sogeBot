import { Mutex } from 'async-mutex';
import fetch from 'node-fetch';

import { persistent, settings } from '../decorators';
import Integration from './_interface';

import { onStartup } from '~/decorators/on';
import { triggerInterfaceOnTip } from '~/helpers/interface';
import { error, info, tip } from '~/helpers/log';
import { adminEndpoint } from '~/helpers/socket';
import eventlist from '~/overlays/eventlist';
import alerts from '~/registries/alerts';

const mutex = new Mutex();

class Tiltify extends Integration {
  @settings()
    access_token = '';
  @settings()
    userName = '';
  @settings()
    userId = '';

  @persistent()
    lastCheckAt = Date.now();

  campaigns: {
    id: number;
    name: string,
    slug: string,
    url: string,
    description: string,
    thumbnail: {
      src: string,
      alt: string,
      width: number,
      height: number
    },
    causeId: number,
    userId: number,
    teamId: null | number,
    fundraisingEventId: number,
    currency: string,
    goal: number,
    supportingCampaignId: number,
    originalGoal: number,
    amountRaised: number,
    totalAmountRaised: number,
    startsOn: string,
    endsOn: string | null
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
    setInterval(async () => {
      if (this.enabled) {
        if (this.access_token.length > 0 && this.userName.length > 0 && String(this.userId).length > 0) {
          const release = await mutex.acquire();
          await this.getCampaigns();
          await this.getDonations();
          release();
        }
      }
    }, 30000);
  }

  async getCampaigns() {
    const response = await fetch(`https://tiltify.com/api/v3/users/${this.userId}/campaigns`, {
      headers: {
        'Authorization': `Bearer ${this.access_token}`,
      },
    });
    this.campaigns = (await response.json()).data;
  }

  async getDonations() {
    for (const campaign of this.campaigns) {
      const response = await fetch(`https://tiltify.com/api/v3/campaign/${campaign.id}/donations`, {
        headers: {
          'Authorization': `Bearer ${this.access_token}`,
        },
      });
      const data = (await response.json()).data as {
        'id': number,
        'amount': number,
        'name': string,
        'comment': string,
        'completedAt': number,
        'rewardId': number,
      }[];

      for (const donate of data) {
        if (this.lastCheckAt < donate.completedAt) {
          tip(`${donate.name}#tiltify, amount: ${Number(donate.amount).toFixed(2)}${campaign.currency}, message: ${donate.comment}`);
          alerts.trigger({
            event:      'tips',
            name:       donate.name,
            amount:     Number(donate.amount.toFixed(2)),
            tier:       null,
            currency:   campaign.currency,
            monthsName: '',
            message:    donate.comment,
          });
          eventlist.add({
            event:     'tip',
            amount:    donate.amount,
            currency:  campaign.currency,
            userId:    `${donate.name}#__anonymous__`,
            message:   donate.comment,
            timestamp: donate.completedAt,
          });
          triggerInterfaceOnTip({
            userName:  donate.name,
            amount:    donate.amount,
            message:   donate.comment,
            currency:  campaign.currency,
            timestamp: donate.completedAt,
          });
        }
      }
    }
  }

  sockets () {
    adminEndpoint('/integrations/tiltify', 'tiltify::revoke', async (cb) => {
      self.access_token = '';
      self.userName = '';
      self.userId = '';
      info(`TILTIFY: User access revoked.`);
      cb(null);
    });
    adminEndpoint('/integrations/tiltify', 'tiltify::code', async (token, cb) => {
      // check if token is working ok
      const response = await fetch(`https://tiltify.com/api/v3/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        this.userName = user.data.username;
        this.userId = user.data.id;
        info(`TILTIFY: Logged in as ${this.userName}#${this.userId}.`);
        self.access_token = token;
      } else {
        error(`TILTIFY: Something went wrong during setting access token. Please retry.`);
      }

      cb(null);
    });
  }
}

const self = new Tiltify();
export default self;
