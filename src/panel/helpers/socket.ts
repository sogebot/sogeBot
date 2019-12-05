import io from 'socket.io-client';
import { setTranslations } from './translate';
const sockets: {[namespace: string]: SocketIOClient.Socket} = {};

const authorizeInProgress = false;

export function getSocket(namespace: string, continueOnUnauthorized = false) {
  if (typeof sockets[namespace] === 'undefined') {
    const socket = io(namespace, { forceNew: true });
    socket.on('authorize', (cb) => {
      if (!authorizeInProgress) {
        // we are sending access token here
        const token = localStorage.getItem('accessToken') || '';
        cb({token, type: 'access'});
      }
    });

    // we didn't have correct accessToken -> refreshToken
    socket.on('refreshToken', (cb) => {
      const token = localStorage.getItem('refreshToken') || '';
      const userId = localStorage.getItem('userId') || 0;
      const type = 'refresh';
      cb({token, type, userId});
    });
    socket.on('authorized', (cb) => {
      console.debug(`AUTHORIZED ACCESS(${cb.type}): ${namespace}`);
      localStorage.setItem('accessToken', cb.accessToken);
      localStorage.setItem('refreshToken', cb.refreshToken);
      localStorage.setItem('userType', cb.type);
    });
    socket.on('unauthorized', (cb) => {
      localStorage.setItem('accessToken', '');
      localStorage.setItem('refreshToken', '');
      localStorage.setItem('userType', 'unauthorized');
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
    getSocket('/core/ui', true).emit('configuration', (configuration) => {
      resolve(configuration);
    });
  });
};