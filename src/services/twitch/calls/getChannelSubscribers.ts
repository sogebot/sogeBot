import { getRepository } from 'typeorm';

import client from '../api/client';

import { HelixSubscription } from '~/../node_modules/@twurple/api/lib';
import { User } from '~/database/entity/user';
import {
  stats as apiStats,
} from '~/helpers/api';
import { error, warning } from '~/helpers/log';
import { isBotId, isBotSubscriber } from '~/helpers/user';
import * as changelog from '~/helpers/user/changelog.js';
import { variable } from '~/helpers/variables';

export async function getChannelSubscribers<T extends { noAffiliateOrPartnerWarningSent?: boolean; notCorrectOauthWarningSent?: boolean }> (opts: T): Promise<{ state: boolean; opts: T }> {
  opts = opts || {};

  try {
    const channelId = variable.get('services.twitch.channelId') as string;
    const broadcasterType = variable.get('services.twitch.broadcasterType') as string;
    const clientBot = await client('bot');

    const getSubscriptionsPaginated = await clientBot.subscriptions.getSubscriptionsPaginated(channelId).getAll();
    if (broadcasterType === '') {
      if (!opts.noAffiliateOrPartnerWarningSent) {
        warning('Broadcaster is not affiliate/partner, will not check subs');
        apiStats.value.currentSubscribers = 0;
      }
      return { state: false, opts: { ...opts, noAffiliateOrPartnerWarningSent: true } };
    }
    apiStats.value.currentSubscribers = getSubscriptionsPaginated.length - 1; // exclude owner
    setSubscribers(getSubscriptionsPaginated.filter(o => !isBotId(o.userId)));
    if (getSubscriptionsPaginated.find(o => isBotId(o.userId))) {
      isBotSubscriber(true);
    } else {
      isBotSubscriber(false);
    }

    // reset warning after correct calls (user may have affiliate or have correct oauth)
    opts.noAffiliateOrPartnerWarningSent = false;
    opts.notCorrectOauthWarningSent = false;
  } catch (e) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
  return { state: true, opts };
}

async function setSubscribers (subscribers: HelixSubscription[]) {
  await changelog.flush();
  const currentSubscribers = await getRepository(User).find({ where: { isSubscriber: true } });

  // check if current subscribers are still subs
  for (const user of currentSubscribers) {
    if (!user.haveSubscriberLock && !subscribers
      .map((o) => String(o.userId))
      .includes(String(user.userId))) {
      // subscriber is not sub anymore -> unsub and set subStreak to 0
      changelog.update(user.userId, {
        ...user,
        isSubscriber:    false,
        subscribeStreak: 0,
      });
    }
  }

  // update subscribers tier and set them active
  for (const user of subscribers) {
    const current = currentSubscribers.find(o => o.userId === user.userId);
    const isNotCurrentSubscriber = !current;
    const valuesNotMatch = current && (current.subscribeTier !== String(Number(user.tier) / 1000) || current.isSubscriber === false);
    if (isNotCurrentSubscriber || valuesNotMatch) {
      changelog.update(user.userId, {
        userName:      user.userName.toLowerCase(),
        isSubscriber:  true,
        subscribeTier: String(Number(user.tier) / 1000),
      });
    }
  }
}