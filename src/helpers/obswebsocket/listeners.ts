import type ObsWebSocket from 'obs-websocket-js';
import type { Socket } from 'socket.io-client';

declare const window: any;

const inputMuted = (obs: ObsWebSocket, socket?: Socket) => {
  const listener = (data: {
    inputName: string; inputMuted: boolean;
  }) => {
    if (process.env.BUILD === 'web') {
      console.debug(`obs::websocket::on:inputmuted ${data.inputName} | ${data.inputMuted}`);
      socket?.emit('integration::obswebsocket::event', {
        type:       'obs-input-mute-state-changed',
        inputName:  data.inputName,
        inputMuted: data.inputMuted,
        location:   window.location.href,
      });
    }
  };
  obs.off('InputMuteStateChanged', listener).on('InputMuteStateChanged', listener);
};

const switchScenes = (obs: ObsWebSocket, socket?: Socket) => {
  const listener = (data: {
    sceneName: string;
  }) => {
    if (process.env.BUILD === 'web') {
      console.debug(`obs::websocket::on:switchscenes ${data.sceneName}`);
      socket?.emit('integration::obswebsocket::event', {
        type:      'obs-scene-changed',
        sceneName: data.sceneName,
        location:  window.location.href,
      });
    }
  };
  obs.off('CurrentProgramSceneChanged', listener).on('CurrentProgramSceneChanged', listener);
};

export { switchScenes, inputMuted };