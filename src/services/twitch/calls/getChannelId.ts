import { tmiEmitter } from '../../../helpers/tmi';
import client from '../api/client';

import { areDecoratorsLoaded } from '~/decorators';
import emitter from '~/helpers/interfaceEmitter';
import {
  error,
  info,
} from '~/helpers/log';
import { updateChannelViewsAndBroadcasterType } from '~/services/twitch/calls/updateChannelViewsAndBroadcasterType';
import { variables } from '~/watchers';

let timeoutId: NodeJS.Timeout | null = null;
let toWait = 10;

export const getChannelId = async () => {
  if ((global as any).mocha) {
    return;
  }
  if (!areDecoratorsLoaded) {
    setTimeout(() => getChannelId(), 1000);
    return;
  }

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  let timeout = 1000;
  const currentChannel = variables.get('services.twitch.currentChannel') as string;
  const generalChannel = variables.get('services.twitch.generalChannel') as string;

  if (currentChannel !== generalChannel && generalChannel !== '') {
    try {
      const clientBot = await client('bot');
      const userFromTwitch = await clientBot.users.getUserByName(generalChannel);
      if (userFromTwitch) {
        emitter.emit('set', '/services/twitch', 'currentChannel', generalChannel);
        emitter.emit('set', '/services/twitch', 'channelId', userFromTwitch.id);
        info('Channel ID set to ' + userFromTwitch.id);
        tmiEmitter.emit('reconnect', 'bot');
        tmiEmitter.emit('reconnect', 'broadcaster');
        updateChannelViewsAndBroadcasterType();
        toWait = 10;
      } else {
        throw new Error('Channel not found on Twitch.');
      }
    } catch (e: any) {
      error(e.stack);
      error(`Cannot get channel ID of ${generalChannel} - waiting ${toWait.toFixed()}s`);
      timeout = toWait * 1000;
      toWait = toWait * 2;
    }
  }

  timeoutId = global.setTimeout(() => getChannelId(), timeout);
};