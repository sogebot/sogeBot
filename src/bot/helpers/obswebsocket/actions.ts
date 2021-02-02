import type ObsWebSocket from 'obs-websocket-js';

import { setMute, setVolume } from './audio';
import {
  pauseRecording, resumeRecording, startRecording, stopRecording,
} from './recording';
import {
  saveReplayBuffer, startReplayBuffer, stopReplayBuffer,
} from './replaybuffer';
import { setCurrentScene } from './scenes';

const availableActions = {
  'SetCurrentScene':   setCurrentScene,
  'StartReplayBuffer': startReplayBuffer,
  'StopReplayBuffer':  stopReplayBuffer,
  'SaveReplayBuffer':  saveReplayBuffer,
  'WaitMs':            (obs: ObsWebSocket, miliseconds: number) => new Promise(resolve => setTimeout(resolve, miliseconds)),
  'StartRecording':    startRecording,
  'StopRecording':     stopRecording,
  'PauseRecording':    pauseRecording,
  'ResumeRecording':   resumeRecording,
  'SetMute':           setMute,
  'SetVolume':         setVolume,
} as const;

export { availableActions };