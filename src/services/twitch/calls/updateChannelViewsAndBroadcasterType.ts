import client from '../api/client';

import { apiEmitter } from '~/helpers/api/emitter';
import emitter, { get } from '~/helpers/interfaceEmitter';
import { error } from '~/helpers/log';

apiEmitter.on('updateChannelViewsAndBroadcasterType', () => updateChannelViewsAndBroadcasterType());

async function updateChannelViewsAndBroadcasterType () {
  try {
    const [ cid, clientBot ] = await Promise.all([
      get<string>('/services/twitch', 'channelId'),
      client('bot'),
    ]);
    const getUserById = await clientBot.users.getUserById(cid);

    if (getUserById) {
      emitter.emit('set', '/services/twitch', 'profileImageUrl', getUserById.profilePictureUrl);
      emitter.emit('set', '/services/twitch', 'broadcasterType', getUserById.broadcasterType);
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      error(e.stack ?? e.message);
    }
  }
  return { state: true };
}

export { updateChannelViewsAndBroadcasterType };