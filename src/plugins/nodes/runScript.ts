import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';
import { Mutex } from 'async-mutex';
import axios from 'axios';
import { VM }  from 'vm2';

import type { Node } from '~/../d.ts/src/plugins';
import { AppDataSource } from '~/database';
import { PluginVariable } from '~/database/entity/plugins';
import { User } from '~/database/entity/user';
import { getBotSender } from '~/helpers/commons';
import { sendMessage } from '~/helpers/commons/sendMessage';
import { debug, error, info } from '~/helpers/log';
import { tmiEmitter } from '~/helpers/tmi';
import * as changelog from '~/helpers/user/changelog.js';
import { isBroadcaster } from '~/helpers/user/isBroadcaster';
import { template } from '~/plugins/template';
import points from '~/systems/points';

const semaphores = new Map<string, Mutex>();

export default async function(pluginId: string, currentNode: Node<string>, parameters: Record<string, any>, variables: Record<string, any>, userstate: { userName: string; userId: string; } | null) {
  // serialize plugin nodes so we don't have issues with db timings
  // this will probably add several ms but should ensure constant results
  if (!semaphores.has(pluginId)) {
    semaphores.set(pluginId, new Mutex());
  }

  const release = await semaphores.get(pluginId)!.acquire();
  const script = currentNode.data.value;
  try {
    const sandbox = {
      axios,
      variable: {
        async load(variableName: string) {
          const variable = await PluginVariable.findOneBy({ variableName, pluginId });
          debug('plugins', `Variable ${variableName} loaded: ${JSON.stringify({ variable }, null, 2)}`);
          return variable?.value ? JSON.parse(variable.value) : undefined;
        },
        async save(variableName: string, value: any) {
          const variable = await PluginVariable.findOneBy({ variableName, pluginId }) || new PluginVariable();
          variable.pluginId = pluginId;
          variable.variableName = variableName;
          variable.value = JSON.stringify(value);
          await variable.save();
          debug('plugins', `Variable ${variableName} saved: ${JSON.stringify({ variable }, null, 2)}`);
          return;
        },
      },
      async log(message: string) {
        info(`PLUGINS#${pluginId}: ${await template(message, { parameters, ...variables }, userstate)}`);
      },
      async debug() {
        info(`PLUGINS#${pluginId}: DEBUG =======================`);
        info(JSON.stringify({
          parameters,
          ...variables,
          databaseVariables: await PluginVariable.findBy({ pluginId }),
          sender:            userstate ? {
            userName: userstate.userName,
            userId:   userstate.userId,
          } : null,
        }, undefined, 2 ));
        info(`PLUGINS#${pluginId}: END DEBUG ===================`);
      },
      twitch: {
        sendMessage(message:string) {
          sendMessage(message, userstate || getBotSender(), { parameters, ...variables });
        },
        timeout(userName:string, timeout: number) {
          tmiEmitter.emit('timeout', userName, timeout, true);
        },
      },
      sender: userstate ? {
        userName: userstate.userName,
        userId:   userstate.userId,
      } : null,
      checks: {
        async isUserModerator(userName: string) {
          await changelog.flush();
          try {
            const user = await AppDataSource.getRepository(User).findOneByOrFail({ userName: userName.toLowerCase() });
            return user.isModerator;
          } catch {
            return false;
          }
        },
        async isUserCaster(userName: string) {
          return isBroadcaster(userName);
        },
      },
      points: {
        async increment(userName: string, value: number) {
          await points.increment({ userName }, Math.abs(Number(value)));
        },
        async decrement(userName: string, value: number) {
          await points.decrement({ userName }, Math.abs(Number(value)));
        },
      },
      locales: {
        getLocalizedName(value: number, format: string) {
          return getLocalizedName(value, format);
        },
      },
      parameters,
      ...variables,
    };
    const vm = new VM({ sandbox });

    const result = await vm.run(`(async function () { ${script} })`)();
    return !!result;
  } catch (e) {
    error(`PLUGINS#${pluginId}: ${(e as Error).stack}`);
    return false;
  } finally {
    release();
  }
}