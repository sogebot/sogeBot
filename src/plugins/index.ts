import type { Node } from '../../d.ts/src/plugins';
import clearCounter from './nodes/clearCounter';
import debounce from './nodes/debounce';
import filter from './nodes/filter';
import filterPermission from './nodes/filterPermission';
import gateCounter from './nodes/gateCounter';
import listener from './nodes/listener';
import othersIdle from './nodes/othersIdle';
import outputLog from './nodes/outputLog';
import overlaysEmoteExplosion from './nodes/overlaysEmoteExplosion';
import overlaysEmoteFirework from './nodes/overlaysEmoteFirework';
import runJavascriptOnCustomOverlay from './nodes/runCustomJavascriptOnOverlay';
import twitchBanUser from './nodes/twitchBanUser';
import twitchSendMessage from './nodes/twitchSendMessage';
import twitchTimeoutUser from './nodes/twitchTimeoutUser';
import updateCounter from './nodes/updateCounter';
import variableSaveToDatabase from './nodes/variableSaveToDatabase';
import variableSetCustomVariable from './nodes/variableSetCustomVariable';
import variableSetVariable from './nodes/variableSetVariable';

import { warning } from '~/helpers/log';

export const processes = {
  listener,
  cron: listener, // no-op
  othersIdle,
  outputLog,
  gateCounter,
  clearCounter,
  updateCounter,
  filterPermission,
  debounce,
  filter,
  variableSaveToDatabase,
  variableSetVariable,
  variableSetCustomVariable,
  twitchTimeoutUser,
  twitchBanUser,
  twitchSendMessage,
  runJavascriptOnCustomOverlay,
  overlaysEmoteFirework,
  overlaysEmoteExplosion,
  node: () => { // this is just helper node
    return true;
  },
  default: (pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) => {
    warning(`PLUGINS: no idea what should I do with ${currentNode.name}, stopping`);
    return false;
  },
};

function processNode (type: keyof typeof processes, pluginId: string, currentNode: Node, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null): Promise<boolean> | boolean {
  return (processes[processes[type] ? type : 'default'](pluginId, currentNode as any, parameters, variables, userstate));
}

export {
  processNode,
};