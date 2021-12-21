import { stats } from '../../../helpers/api/stats.js';
import client from '../api/client';
import { refresh } from '../token/refresh.js';

import emitter from '~/helpers/interfaceEmitter';
import { error } from '~/helpers/log';
import { variables } from '~/watchers';

async function updateChannelViewsAndBroadcasterType () {
  try {
    const cid = variables.get('services.twitch.channelId') as string;
    const clientBot = await client('bot');
    const getUserById = await clientBot.users.getUserById(cid);

    if (getUserById) {
      emitter.emit('set', '/services/twitch', 'profileImageUrl', getUserById.profilePictureUrl);
      emitter.emit('set', '/services/twitch', 'broadcasterType', getUserById.broadcasterType);
      stats.value.currentViews = getUserById.views;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'Invalid OAuth token') {
        await refresh('bot');
      } else {
        error(e.stack ?? e.message);
      }
    }
  }
  return { state: true };
}

export { updateChannelViewsAndBroadcasterType };