import type { RequestMethodsArgsMap } from 'obs-websocket-js';
import { EntitySchema } from 'typeorm';

type simpleModeTask<K extends keyof RequestMethodsArgsMap> = {
  event: K,
  args: RequestMethodsArgsMap[K] extends Record<string, unknown>
    ? RequestMethodsArgsMap[K]
    : null,
};

export interface OBSWebsocketInterface {
  id?: number;
  name: string;
  advancedMode: boolean;
  advancedModeCode: string;
  simpleModeTasks: simpleModeTask<keyof RequestMethodsArgsMap>[];
}

export const OBSWebsocket = new EntitySchema<Readonly<Required<OBSWebsocketInterface>>>({
  name: 'obswebsocket',
  columns: {
    id: { type: Number, primary: true },
    name: { type: String },
    advancedMode: { type: 'boolean', default: false },
    advancedModeCode: { type: 'text' },
    simpleModeTasks: { type: 'simple-json' },
  },
});