import type { RequestMethodsArgsMap } from 'obs-websocket-js';
import { EntitySchema } from 'typeorm';

export type simpleModeTask<K extends keyof RequestMethodsArgsMap> = {
  id: string,
  event: K,
  args: RequestMethodsArgsMap[K] extends Record<string, unknown>
    ? RequestMethodsArgsMap[K]
    : null,
};

export type simpleModeTaskWaitMS = {
  id: string,
  event: 'WaitMs',
  args: { miliseconds: number; }
};

export type simpleModeTaskLog = {
  id: string,
  event: 'Log',
  args: { logMessage: string; }
};

export interface OBSWebsocketInterface {
  id: string;
  name: string;
  advancedMode: boolean;
  advancedModeCode: string;
  simpleModeTasks: (simpleModeTask<keyof RequestMethodsArgsMap> | simpleModeTaskWaitMS | simpleModeTaskLog)[];
}

export const OBSWebsocket = new EntitySchema<Readonly<Required<OBSWebsocketInterface>>>({
  name:    'obswebsocket',
  columns: {
    id:               { type: 'varchar', length: '14', primary: true },
    name:             { type: String },
    advancedMode:     { type: 'boolean', default: false },
    advancedModeCode: { type: 'text' },
    simpleModeTasks:  { type: 'simple-json' },
  },
});