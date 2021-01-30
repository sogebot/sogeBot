import type ObsWebSocket from 'obs-websocket-js';
import type { Socket } from 'socket.io-client';

import { eventEmitter } from '../events';

declare const window: any;

const switchScenes = (obs: ObsWebSocket, socket?: Socket) => {
  const listener = (data: {
    'scene-name': string;
    sources: ObsWebSocket.SceneItem[];
  }) => {
    if (process.env.BUILD === 'web') {
      console.debug(`obs::websocket::on:switchscenes ${data['scene-name']}`);
      socket?.emit('integration::obswebsocket::event', {
        type:      'obs-scene-changed',
        sceneName: data['scene-name'],
        location:  window.location.href,
      });
    } else {
      eventEmitter.emit('obs-scene-changed', {
        sceneName:  data['scene-name'],
        isDirect:   true,
        linkFilter: '',
      });
    }
  };
  obs.off('SwitchScenes', listener).on('SwitchScenes', listener);
};

export { switchScenes };