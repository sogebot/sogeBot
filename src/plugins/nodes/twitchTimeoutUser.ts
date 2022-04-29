import { template } from '../template';

import type { Node } from '~/../d.ts/src/plugins';
import { info, timeout as timeoutLog, warning } from '~/helpers/log';
import { tmiEmitter } from '~/helpers/tmi';
import { isModerator } from '~/helpers/user';

export default async function(pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: ChatUser) {
  let seconds = await template(currentNode.data.value, { parameters, ...variables });
  if (isNaN(Number(seconds))) {
    warning(`PLUGINS#${pluginId}: Idling value is not a number! Got: ${seconds}, defaulting to 600s`);
    seconds = '600';
  }
  info(`PLUGINS#${pluginId}: Timeouting user ${userstate.userName}#${userstate.userId} for ${seconds}s`);
  tmiEmitter.emit('timeout', userstate.userName, Number(seconds), isModerator(userstate));
  return true;
}