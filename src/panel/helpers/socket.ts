import { io, Socket } from 'socket.io-client';
import { setTranslations } from './translate';
import axios from 'axios';

export const redirectLogin = () => {
  if (window.location.href.includes('popout')) {
    window.location.assign(window.location.origin + '/login#error=popout+must+be+logged');
  } else {
    window.location.assign(window.location.origin + '/login');
  }
};

export function getSocket(namespace: string, continueOnUnauthorized = false): Socket {
  const socket = io(namespace, {
    forceNew: true,
    auth: {
      token: localStorage.getItem('accessToken'),
    },
  });
  socket.connect();
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
      if (error === 'Invalid namespace') {
        throw new Error(error + ' ' + namespace);
      }
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
  getSocket('/', true).emit('translations', (translations: any) => {
    if (process.env.IS_DEV) {
      console.groupCollapsed('GET=>Translations');
      console.debug({translations});
      console.groupEnd();
    }
    setTranslations(translations);
  });
};

type Configuration = {
  [x:string]: Configuration | string;
};
export const getConfiguration = async (): Promise<Configuration> => {
  return new Promise((resolve) => {
    getSocket('/core/ui', true).emit('configuration', (err: string | null, configuration: Configuration) => {
      if (err) {
        return console.error(err);
      }
      if (process.env.IS_DEV) {
        console.groupCollapsed('GET=>Configuration');
        console.debug({configuration});
        console.groupEnd();
      }
      resolve(configuration);
    });
  });
};