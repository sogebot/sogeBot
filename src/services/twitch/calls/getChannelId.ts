import { apiEmitter } from '../../../helpers/api';
import { tmiEmitter } from '../../../helpers/tmi';
import client from '../api/client';

import { areDecoratorsLoaded } from '~/decorators';
import emitter, { get } from '~/helpers/interfaceEmitter';
import {
  error,
  info,
} from '~/helpers/log';

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
  const [ currentChannel, generalChannel ] = await Promise.all([
    get<string>('/services/twitch', 'currentChannel'),
    get<string>('/services/twitch', 'generalChannel'),
  ]);

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
        apiEmitter.emit('updateChannelViewsAndBroadcasterType');
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