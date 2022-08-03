import type ObsWebSocket from 'obs-websocket-js';
import type { Socket } from 'socket.io-client';

import { eventEmitter } from '../events';

declare const window: any;

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
    } else {
      eventEmitter.emit('obs-scene-changed', {
        sceneName:  data.sceneName,
        isDirect:   true,
        linkFilter: '',
      });
    }
  };
  obs.off('CurrentProgramSceneChanged', listener).on('CurrentProgramSceneChanged', listener);
};

export { switchScenes };