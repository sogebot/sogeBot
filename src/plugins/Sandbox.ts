/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getTime } from '@sogebot/ui-helpers/getTime.js';
import axios, { AxiosRequestConfig } from 'axios';
import ts from 'typescript';

import { CustomVariableGenerator } from './CustomVariable.js';
import { ListenToGenerator, Types } from './ListenTo.js';
import { LogGenerator } from './Log.js';
import { PermissionGenerator } from './Permission.js';
import { TwitchGenerator } from './Twitch.js';
import { VariableGenerator } from './Variable.js';

import type { EmitData } from '~/database/entity/alert.js';
import { Plugin } from '~/database/entity/plugins.js';
import { chatMessagesAtStart, isStreamOnline, stats } from '~/helpers/api/index.js';
import { streamStatusChangeSince } from '~/helpers/api/streamStatusChangeSince.js';
import { getUserSender } from '~/helpers/commons/index.js';
import { mainCurrency, symbol } from '~/helpers/currency/index.js';
import emitter from '~/helpers/interfaceEmitter.js';
import { debug, info } from '~/helpers/log.js';
import { linesParsed } from '~/helpers/parser.js';
import defaultPermissions from '~/helpers/permissions/defaultPermissions.js';
import getBotId from '~/helpers/user/getBotId.js';
import getBotUserName from '~/helpers/user/getBotUserName.js';
import { getRandomOnlineSubscriber, getRandomSubscriber, getRandomOnlineViewer, getRandomViewer } from '~/helpers/user/random.js';
import tts from '~/overlays/texttospeech.js';
import alerts from '~/registries/alerts.js';
import points from '~/systems/points.js';
import users from '~/users.js';

export const transpiledFiles = new Map<string, string>();

export const runScriptInSandbox = (plugin: Plugin,
  userstate: { userName: string, userId: string } | null,
  message: string,
  type: Types,
  ___code___: {
    name: string;
    source: string;
    id: string;
  },
  params: any,
  ______opts: {
    socket: any
  }) => {
  // @ts-expect-error TS6133
  const ListenTo = ListenToGenerator(plugin.id, type, message, userstate, params);
  // @ts-expect-error TS6133
  const Twitch = TwitchGenerator(plugin.id, userstate);
  // @ts-expect-error TS6133
  const Permission = PermissionGenerator(plugin.id);
  // @ts-expect-error TS6133
  const permission = defaultPermissions;
  // @ts-expect-error TS6133
  const Log = LogGenerator(plugin.id, ___code___.name);
  // @ts-expect-error TS6133
  const Variable = VariableGenerator(plugin.id);
  // @ts-expect-error TS6133
  const CustomVariable = CustomVariableGenerator(plugin.id);
  // @ts-expect-error TS6133
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
  // @ts-expect-error TS6133
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
  // @ts-expect-error TS6133
  const Points = {
    async increment(userName: string, value: number) {
      await points.increment({ userName }, Math.abs(Number(value)));
    },
    async decrement(userName: string, value: number) {
      await points.decrement({ userName }, Math.abs(Number(value)));
    },
  };
  // @ts-expect-error TS6133
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
    triggerTTSOverlay(parameters: string) {
      tts.textToSpeech({
        discord:            undefined,
        createdAt:          Date.now(),
        emotesOffsets:      new Map(),
        isFirstTimeMessage: false,
        isHighlight:        false,
        isAction:           false,
        sender:             getUserSender(getBotId(), getBotUserName()),
        parameters,
        attr:               {
          highlight: false,
        },
        command: '!tts',
      });
    },
  };
  // @ts-expect-error TS6133
  const fetch = async (uri: string, config: AxiosRequestConfig) => {
    return (await axios(uri, config));
  };
  // @ts-expect-error TS6133
  const stream = {
    uptime:             getTime(isStreamOnline.value ? streamStatusChangeSince.value : null, false),
    currentViewers:     stats.value.currentViewers,
    currentSubscribers: stats.value.currentSubscribers,
    currentBits:        stats.value.currentBits,
    currentTips:        stats.value.currentTips,
    currency:           symbol(mainCurrency.value),
    chatMessages:       (isStreamOnline.value) ? linesParsed - chatMessagesAtStart.value : 0,
    currentFollowers:   stats.value.currentFollowers,
    maxViewers:         stats.value.maxViewers,
    newChatters:        stats.value.newChatters,
    game:               stats.value.currentGame,
    status:             stats.value.currentTitle,
    currentWatched:     stats.value.currentWatchedTime,
    channelDisplayName: stats.value.channelDisplayName,
    channelUserName:    stats.value.channelUserName,
  };

  eval(getTranspiledCode(___code___.id, ___code___.source));
};

const getTranspiledCode = (codeId: string, source: string) => {
  if (transpiledFiles.has(codeId)) {
    debug('plugins', `Using cached code ${codeId}`);
    return transpiledFiles.get(codeId)!;
  } else {
    debug('plugins', `Transpiling code ${codeId}`);
    transpiledFiles.set(codeId, ts.transpile(source));
    return transpiledFiles.get(codeId)!;
  }
};