import { EntitySchema } from 'typeorm';

export namespace simpleModeTasks {
  export type WaitMS = {
    id: string,
    event: 'WaitMs',
    args: { miliseconds: number; }
  };
  export type TaskLog = {
    id: string,
    event: 'Log',
    args: { logMessage: string; }
  };
  export type SetCurrentScene = {
    id: string,
    event: 'SetCurrentScene',
    args: { sceneName: string; }
  };
  export type ReplayBuffer = {
    id: string,
    event: 'StartReplayBuffer' | 'StopReplayBuffer' | 'SaveReplayBuffer',
    args: Record<string, never>
  };
  export type Recording = {
    id: string,
    event: 'StartRecording' | 'StopRecording' | 'PauseRecording' | 'ResumeRecording',
    args: Record<string, never>
  };
  export type SetMute = {
    id: string,
    event: 'SetMute',
    args: { source: string; mute: boolean; }
  };
  export type SetVolume = {
    id: string,
    event: 'SetVolume',
    args: { source: string; volume: number; }
  };
}
export type simpleModeTask =
  simpleModeTasks.WaitMS
  | simpleModeTasks.TaskLog
  | simpleModeTasks.SetCurrentScene
  | simpleModeTasks.ReplayBuffer
  | simpleModeTasks.Recording
  | simpleModeTasks.SetMute
  | simpleModeTasks.SetVolume;

export interface OBSWebsocketInterface {
  id: string;
  name: string;
  advancedMode: boolean;
  advancedModeCode: string;
  simpleModeTasks: (simpleModeTask)[];
}

export const OBSWebsocket = new EntitySchema<Readonly<Required<OBSWebsocketInterface>>>({
  name:    'obswebsocket',
  columns: {
    id: {
      type: 'varchar', length: '14', primary: true,
    },
    name:             { type: String },
    advancedMode:     { type: 'boolean', default: false },
    advancedModeCode: { type: 'text' },
    simpleModeTasks:  { type: 'simple-json' },
  },
});