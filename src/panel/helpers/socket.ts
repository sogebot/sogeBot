import io from 'socket.io-client';
import { setTranslations } from './translate';

import type { SocketInterface } from 'src/bot/database/entity/socket';

const sockets: {[namespace: string]: SocketIOClient.Socket} = {};

let authorizeInProgress = false;

const waitForAuthorization = async () => {
  return new Promise((resolve) => {
    const check = () => {
      if (!authorizeInProgress) {
        resolve();
      } else {
        setTimeout(() => check(), 100);
      }
    };
    check();
  });
};

export function getSocket(namespace: string, continueOnUnauthorized = false) {
  /* if (!continueOnUnauthorized) {
    throw new Error('Redirecting, user is not authenticated');
  } */
  if (typeof sockets[namespace] === 'undefined') {
    const socket = io(namespace, { forceNew: true });
    socket.on('authorize', async (cb) => {
      await waitForAuthorization();
      authorizeInProgress = true;
      const token = localStorage.getItem('accessToken') || '';
      console.groupCollapsed('socket::authorize ' + namespace);
      console.debug({token, type: 'access'});
      console.groupEnd();
      cb({token, type: 'access'});
    });

    // we didn't have correct accessToken -> refreshToken
    socket.on('refreshToken', (cb) => {
      const token = localStorage.getItem('refreshToken') || '';
      const userId = Number(localStorage.getItem('userId') || 0);
      const type = 'refresh';
      console.groupCollapsed('socket::refreshToken');
      console.debug({token, type, userId});
      console.groupEnd();
      cb({token, type, userId});
    });
    socket.on('authorized', (cb: Readonly<SocketInterface>) => {
      console.debug(`AUTHORIZED ACCESS(${cb.type}): ${namespace}`);
      localStorage.setItem('accessToken', cb.accessToken || '');
      localStorage.setItem('refreshToken', cb.refreshToken);
      localStorage.setItem('userType', cb.type);
      localStorage.setItem('userId', String(cb.userId));
      authorizeInProgress = false;
    });
    socket.on('unauthorized', (cb) => {
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
      authorizeInProgress = false;
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
    getSocket('/core/ui', true).emit('configuration', (err, configuration) => {
      if (err) {
        return console.error(err);
      }
      resolve(configuration);
    });
  });
};