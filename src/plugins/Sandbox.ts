/* eslint-disable @typescript-eslint/ban-ts-comment */
import axios, { AxiosRequestConfig } from 'axios';
import * as ts from 'typescript';

import { Types } from './ListenTo';
import { getRandomOnlineSubscriber, getRandomSubscriber, getRandomOnlineViewer, getRandomViewer } from '../../dest/helpers/user/random';

import type { EmitData } from '~/database/entity/alert';
import { Plugin } from '~/database/entity/plugins';
import emitter from '~/helpers/interfaceEmitter';
import { info } from '~/helpers/log';
import alerts from '~/registries/alerts';
import points from '~/systems/points';
import users from '~/users';

export const runScriptInSandbox = (plugin: Plugin,
  userstate: { userName: string, userId: string } | null,
  message: string,
  type: Types,
  ___code___: {
    name: string;
    source: string;
    id: string;
  },
  ______opts: {
    socket: any
  }) => {
  // @ts-ignore
  const ListenTo = ListenToGenerator(plugin.id, type, message, userstate, params);
  // @ts-ignore
  const Twitch = TwitchGenerator(plugin.id, userstate);
  // @ts-ignore
  const Permission = PermissionGenerator(plugin.id);
  // @ts-ignore
  const permission = defaultPermissions;
  // @ts-ignore
  const Log = LogGenerator(plugin.id, ___code___.name);
  // @ts-ignore
  const Variable = VariableGenerator(plugin.id);
  // @ts-ignore
  const Alerts = {
    async trigger(uuid: string, name?: string, msg?: string, customOptions?: EmitData['customOptions']) {
      if (customOptions) {
        info(`PLUGINS#${plugin.id}: Triggering alert ${uuid} with custom options ${JSON.stringify(customOptions)}`);
      } else {
        info(`PLUGINS#${plugin.id}: Triggering alert ${uuid}`);
      }
      await alerts.trigger({
        amount:     0,
        currency:   'CZK',
        event:      'custom',
        alertId:    uuid,
        message:    msg || '',
        monthsName: '',
        name:       name ?? '',
        tier:       null,
        recipient:  userstate?.userName ?? '',
        customOptions,
      });
    },
  };
  // @ts-ignore
  const User = {
    async getByUserId(userId: string) {
      return users.getUserByUserId(userId);
    },
    async getByUserName(userName: string) {
      return users.getUserByUsername(userName);
    },
    getRandom: {
      subscriber(onlineOnly: boolean) {
        return onlineOnly ? getRandomOnlineSubscriber() : getRandomSubscriber();
      },
      viewer(onlineOnly: boolean) {
        return onlineOnly ? getRandomOnlineViewer() : getRandomViewer();
      },
    },
  };
  // @ts-ignore
  const Points = {
    async increment(userName: string, value: number) {
      await points.increment({ userName }, Math.abs(Number(value)));
    },
    async decrement(userName: string, value: number) {
      await points.decrement({ userName }, Math.abs(Number(value)));
    },
  };
  // @ts-ignore
  const Overlay = {
    emoteExplosion(emotes: string[]) {
      emitter.emit('services::twitch::emotes', 'explode', emotes);
    },
    emoteFirework(emotes: string[]) {
      emitter.emit('services::twitch::emotes', 'firework', emotes);
    },
    runFunction(functionName: string, args: any[], overlayId?: string) {
      ______opts.socket?.emit('trigger::function', functionName, args, overlayId);
    },
  };
  // @ts-ignore
  const fetch = async (uri: string, config: AxiosRequestConfig) => {
    return (await axios(uri, config));
  };
  eval(ts.transpile(___code___.source));
};