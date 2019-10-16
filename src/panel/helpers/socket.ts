import io from 'socket.io-client';
declare let token: string;
import { setTranslations } from './translate';

const sockets: {[namespace: string]: SocketIOClient.Socket} = {};

export function getSocket(namespace: string) {
  if (typeof sockets[namespace] === 'undefined') {
    sockets[namespace] = io(namespace, { query: 'token=' + token, forceNew: true });
  }
  return sockets[namespace];
}

export const getTranslations = async () => {
  console.debug('Getting translations');
  return new Promise((resolve) => {
    getSocket('/').emit('translations', (translations) => {
      console.debug({translations});
      setTranslations(translations);
      resolve(translations);
    });
  });
};

export const getConfiguration = async () => {
  console.debug('Getting configuration');
  return new Promise((resolve) => {
    getSocket('/').emit('getConfiguration', (configuration) => {
      console.debug({configuration});
      resolve(configuration);
    });
  });
};