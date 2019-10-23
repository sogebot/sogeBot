import io from 'socket.io-client';
import { setTranslations } from './translate';
const sockets: {[namespace: string]: SocketIOClient.Socket} = {};

const authorizeInProgress = false;

export function getSocket(namespace: string, continueOnUnauthorized = false) {
  if (typeof sockets[namespace] === 'undefined') {
    const socket = io(namespace, { forceNew: true });
    socket.on('authorize', (cb) => {
      if (!authorizeInProgress) {
        const accessToken = localStorage.getItem('accessToken') || '';
        const refreshToken = localStorage.getItem('refreshToken') || '';
        cb({accessToken, refreshToken});
      }
    });
    socket.on('authorized', (cb) => {
      console.debug('AUTHORIZED ACCESS: ' + namespace);
      console.debug(window.location.href);
      localStorage.setItem('accessToken', cb.accessToken);
      localStorage.setItem('refreshToken', cb.refreshToken);
      localStorage.setItem('userType', cb.type);
    });
    socket.on('unauthorized', (cb) => {
      if (!continueOnUnauthorized) {
        console.debug(window.location.href);
        console.debug('UNAUTHORIZED ACCESS: ' + namespace);
        if (window.location.href.includes('popout')) {
          window.location.replace(window.location.origin + '/login#error=popout+must+be+logged');
        } else {
          window.location.replace(window.location.origin + '/login');
        }
      }
      console.debug(window.location.href);
      console.debug('UNAUTHORIZED ACCESS (OK): ' + namespace);
    });
    sockets[namespace] = socket;
  }
  return sockets[namespace];
}

export const getTranslations = async () => {
  console.debug('Getting translations');
  return new Promise((resolve) => {
    getSocket('/', true).emit('translations', (translations) => {
      console.debug({translations});
      setTranslations(translations);
      resolve(translations);
    });
  });
};

export const getConfiguration = async () => {
  console.debug('Getting configuration');
  return new Promise((resolve) => {
    getSocket('/', true).emit('getConfiguration', (configuration) => {
      resolve(configuration);
    });
  });
};