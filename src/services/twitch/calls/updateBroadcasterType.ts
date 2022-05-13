import client from '../api/client';
import { refresh } from '../token/refresh.js';

import { getFunctionName } from '~/helpers/getFunctionName.js';
import emitter from '~/helpers/interfaceEmitter';
import { error, warning } from '~/helpers/log';
import { variables } from '~/watchers';

async function updateBroadcasterType () {
  try {
    const cid = variables.get('services.twitch.broadcasterId') as string;
    const clientBroadcaster = await client('broadcaster');
    const getUserById = await clientBroadcaster.users.getUserById(cid);

    if (getUserById) {
      emitter.emit('set', '/services/twitch', 'profileImageUrl', getUserById.profilePictureUrl);
      emitter.emit('set', '/services/twitch', 'broadcasterType', getUserById.broadcasterType);
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('Invalid OAuth token')) {
        warning(`${getFunctionName()} => Invalid OAuth token - attempting to refresh token`);
        await refresh('broadcaster');
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return { state: true };
}

export { updateBroadcasterType };