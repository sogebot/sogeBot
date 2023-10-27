import util from 'util';

import { ChatSubInfo } from '@twurple/chat';

import eventlist from '../../overlays/eventlist.js';
import alerts from '../../registries/alerts.js';
import { triggerInterfaceOnSub } from '../interface/index.js';
import { error, sub } from '../log.js';
import {
  isIgnored,
} from '../user/index.js';

import { eventEmitter } from './index.js';

import { EmitData } from '~/database/entity/alert.js';
import * as hypeTrain from '~/helpers/api/hypeTrain.js';
import * as changelog from '~/helpers/user/changelog.js';
import getUserByName from '~/services/twitch/calls/getUserByName.js';

export const subscription = async (username: string , subInfo: ChatSubInfo, userstate: ChatUser) => {
  try {
    const amount = subInfo.months;
    const tier = (subInfo.isPrime ? 'Prime' : String(Number(subInfo.plan ?? 1000) / 1000)) as EmitData['tier'];

    if (isIgnored({ userName: username, userId: userstate.userId })) {
      return;
    }

    const user = await changelog.get(userstate.userId);
    if (!user) {
      changelog.update(userstate.userId, { userName: username });
      subscription(username, subInfo, userstate);
      return;
    }

    let profileImageUrl = null;
    if (user.profileImageUrl.length === 0) {
      const res = await getUserByName(username);
      if (res) {
        profileImageUrl = res.profilePictureUrl;
      }
    }

    changelog.update(user.userId, {
      ...user,
      isSubscriber:              user.haveSubscriberLock ? user.isSubscriber : true,
      subscribedAt:              user.haveSubscribedAtLock ? user.subscribedAt : new Date().toISOString(),
      subscribeTier:             String(tier),
      subscribeCumulativeMonths: amount,
      subscribeStreak:           0,
      profileImageUrl:           profileImageUrl ? profileImageUrl : user.profileImageUrl,
    });

    hypeTrain.addSub({
      username:        user.userName,
      profileImageUrl: profileImageUrl ? profileImageUrl : user.profileImageUrl,
    });

    eventlist.add({
      event:     'sub',
      tier:      String(tier),
      userId:    String(userstate.userId),
      method:    subInfo.isPrime ? 'Twitch Prime' : '' ,
      timestamp: Date.now(),
    });
    sub(`${username}#${userstate.userId}, tier: ${tier}`);
    eventEmitter.emit('subscription', {
      userName: username, method: subInfo.isPrime ? 'Twitch Prime' : '', subCumulativeMonths: amount, tier: String(tier),
    });
    alerts.trigger({
      event:      'sub',
      name:       username,
      amount:     0,
      tier,
      currency:   '',
      monthsName: '',
      message:    '',
    });

    triggerInterfaceOnSub({
      userName:            username,
      userId:              userstate.userId,
      subCumulativeMonths: amount,
    });
  } catch (e: any) {
    error('Error parsing subscription event');
    error(util.inspect(userstate));
    error(e.stack);
  }
};