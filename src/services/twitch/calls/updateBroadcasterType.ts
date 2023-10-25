import { isDebugEnabled } from '~/helpers/debug.js';
import { getFunctionName } from '~/helpers/getFunctionName.js';
import emitter from '~/helpers/interfaceEmitter.js';
import { debug, error, warning } from '~/helpers/log.js';
import twitch from '~/services/twitch.js';
import { variables } from '~/watchers.js';

async function updateBroadcasterType () {
  if (isDebugEnabled('api.calls')) {
    debug('api.calls', new Error().stack);
  }
  try {
    const cid = variables.get('services.twitch.broadcasterId') as string;
    const getUserById = await twitch.apiClient?.asIntent(['broadcaster'], ctx => ctx.users.getUserById(cid));

    if (getUserById) {
      emitter.emit('set', '/services/twitch', 'profileImageUrl', getUserById.profilePictureUrl);
      emitter.emit('set', '/services/twitch', 'broadcasterType', getUserById.broadcasterType);
    }
  } catch (e) {
    if (e instanceof Error) {
      if (e.message.includes('ETIMEDOUT')) {
        warning(`${getFunctionName()} => Connection to Twitch timed out. Will retry request.`);
        return { state: false }; // ignore etimedout error
      } else {
        error(`${getFunctionName()} => ${e.stack ?? e.message}`);
      }
    }
  }
  return { state: true };
}

export { updateBroadcasterType };