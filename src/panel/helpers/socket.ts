import io from 'socket.io-client';
import { setTranslations } from './translate';
import axios from 'axios';

export const redirectLogin = () => {
  if (window.location.href.includes('popout')) {
    window.location.replace(window.location.origin + '/login#error=popout+must+be+logged');
  } else {
    window.location.replace(window.location.origin + '/login');
  }
};

export function getSocket(namespace: string, continueOnUnauthorized = false) {
  const socket = io(namespace, {
    forceNew: true,
    query: {
      token: localStorage.getItem('accessToken'),
    },
  });
  socket.on('error', (error: string) => {
    if (error === 'TokenExpiredError: jwt expired') {
      console.debug('Using refresh token to obtain new access token');
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken === '' || refreshToken === null) {
        // no refresh token -> unauthorize or force relogin
        localStorage.setItem('userType', 'unauthorized');
        if (!continueOnUnauthorized) {
          console.debug(window.location.href);
          redirectLogin();
        }
      } else {
        axios.get(`${window.location.origin}/socket/refresh`, {
          headers: {
            'x-twitch-token': refreshToken,
          },
        }).then(validation => {
          localStorage.setItem('accessToken', validation.data.accessToken);
          localStorage.setItem('refreshToken', validation.data.refreshToken);
          localStorage.setItem('userType', validation.data.userType);
          // reconnect
          socket.disconnect();
          socket.io.opts.query = {
            token: localStorage.getItem('accessToken'),
          }; // replace with another authorization query
          console.debug('Reconnecting with new token');
          socket.connect();
        }).catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('code');
          localStorage.removeItem('clientId');
          localStorage.setItem('userType', 'unauthorized');
          if (continueOnUnauthorized) {
            location.reload();
          } else {
            redirectLogin();
          }
        });
      }
    } else {
      redirectLogin();
    }
  });
  socket.on('forceDisconnect', () => {
    if (localStorage.getItem('userType') === 'viewer' || localStorage.getItem('userType') === 'admin') {
      console.debug('Forced disconnection from bot socket.');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('code');
      localStorage.removeItem('clientId');
      localStorage.setItem('userType', 'unauthorized');
      if (continueOnUnauthorized) {
        location.reload();
      } else {
        redirectLogin();
      }
    }
  });
  return socket;
}

export const getTranslations = async () => {
  console.debug('Getting translations');
  getSocket('/', true).emit('translations', (translations: any) => {
    console.debug({translations});
    setTranslations(translations);
  });
};

export const getConfiguration = async () => {
  console.debug('Getting configuration');
  return new Promise((resolve) => {
    getSocket('/core/ui', true).emit('configuration', (err: string | null, configuration: any) => {
      if (err) {
        return console.error(err);
      }
      resolve(configuration);
    });
  });
};