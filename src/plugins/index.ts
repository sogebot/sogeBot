import type { Node } from '../../d.ts/src/plugins';
import debounce from './nodes/debounce';
import filter from './nodes/filter';
import filterPermission from './nodes/filterPermission';
import listener from './nodes/listener';
import othersIdle from './nodes/othersIdle';
import outputLog from './nodes/outputLog';
import twitchBanUser from './nodes/twitchBanUser';
import twitchSendMessage from './nodes/twitchSendMessage';
import twitchTimeoutUser from './nodes/twitchTimeoutUser';
import variableSaveToDatabase from './nodes/variableSaveToDatabase';
import variableSetVariable from './nodes/variableSetVariable';

import { warning } from '~/helpers/log';

export const processes = {
  listener,
  othersIdle,
  outputLog,
  filterPermission,
  debounce,
  filter,
  variableSaveToDatabase,
  variableSetVariable,
  twitchTimeoutUser,
  twitchBanUser,
  twitchSendMessage,
  default: (pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; }) => {
    warning(`PLUGINS: no idea what should I do with ${currentNode.name}, stopping`);
    return false;
  },
};

function processNode (type: keyof typeof processes, pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; }): Promise<boolean> | boolean {
  return (processes[processes[type] ? type : 'default'](pluginId, currentNode as any, parameters, variables, userstate));
}

export {
  processNode,
};