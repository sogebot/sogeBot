import { HelixSubscription } from '@twurple/api/lib';

import { User } from '~/database/entity/user.js';
import { AppDataSource } from '~/database.js';
import {
  stats as apiStats,
} from '~/helpers/api/index.js';
import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import { debug, error, warning } from '~/helpers/log.js';
import * as changelog from '~/helpers/user/changelog.js';
import { isBotId, isBotSubscriber } from '~/helpers/user/index.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

export async function getChannelSubscribers<T extends { noAffiliateOrPartnerWarningSent?: boolean; notCorrectOauthWarningSent?: boolean }> (opts: T): Promise<{ state: boolean; opts: T }> {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  opts = opts || {};

  try {
    const broadcasterId = variables.get('services.twitch.broadcasterId') as string;
    const broadcasterType = variables.get('services.twitch.broadcasterType') as string;

    if (broadcasterType !== 'partner' && broadcasterType !== 'affiliate') {
      if (!opts.noAffiliateOrPartnerWarningSent) {
        warning('Broadcaster is not affiliate/partner, will not check subs');
        apiStats.value.currentSubscribers = 0;
      }
      return { state: false, opts: { ...opts, noAffiliateOrPartnerWarningSent: true } };
    }
    const getSubscriptionsPaginated = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.subscriptions.getSubscriptionsPaginated(broadcasterId).getAll());
    if (!getSubscriptionsPaginated) {
      return { state: false, opts };
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
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        return { state: false, opts }; // ignore etimedout error
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return { state: true, opts };
}

async function setSubscribers (subscribers: HelixSubscription[]) {
  await changelog.flush();
  const currentSubscribers = await AppDataSource.getRepository(User).find({ where: { isSubscriber: true } });

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