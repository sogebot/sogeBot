import Core from './_interface';
import { settings, ui } from './decorators';
import { MINUTE, SECOND } from './constants';
import { isMainThread } from 'worker_threads';
import uuid = require('uuid/v4');
import { permission } from './helpers/permissions';

type Auth = {
  userId: string;
  type: 'admin' | 'viewer' | 'public',
  accessToken: string | null;
  accessTokenTimestamp: number;
  refreshToken: string;
  refreshTokenTimestamp: number;
}

let sockets: Auth[] = [];

const endpoints: {
  type: 'admin' | 'viewer' | 'public';
  on: string;
  nsp: string;
  callback: Function;
}[] = [];

const adminEndpoint = (nsp: string, on: string, callback: Function) => {
  endpoints.push({ nsp, on, callback, type: 'admin' });
};
const viewerEndpoint = (nsp: string, on: string, callback: Function) => {
  endpoints.push({ nsp, on, callback, type: 'viewer' });
};
const publicEndpoint = (nsp: string, on: string, callback: Function) => {
  endpoints.push({ nsp, on, callback, type: 'public' });
};

class Socket extends Core {
  @settings('connection')
  accessTokenExpirationTime = 120;

  @settings('connection')
  refreshTokenExpirationTime = 604800;

  @ui({
    type: 'btn-emit',
    class: 'btn btn-danger btn-block mt-1 mb-1',
    emit: 'purgeAllConnections',
  }, 'connection')
  purgeAllConnections = null;

  constructor() {
    super();

    if (isMainThread) {
      setInterval(() => {
        sockets = sockets.filter(socket => {
          const isAccessTokenExpired = socket.accessTokenTimestamp + (this.accessTokenExpirationTime * 1000) < Date.now();
          const isRefreshTokenExpired = socket.refreshTokenTimestamp + (this.refreshTokenExpirationTime * 1000) < Date.now();
          return !(isRefreshTokenExpired && isAccessTokenExpired);
        });
      }, MINUTE);

      setInterval(() => {
        sockets = sockets.map(socket => {
          const isAccessTokenExpired = socket.accessTokenTimestamp + (this.accessTokenExpirationTime * 1000) < Date.now();
          if (isAccessTokenExpired) {
            // expire token
            socket.accessToken = null;
          }
          return socket;
        });
      }, 10 * SECOND);
    }
  }

  authorize(socket, next) {
    const sendAuthorized = (socket, auth) => {
      socket.emit('authorized', { accessToken: auth.accessToken, refreshToken: auth.refreshToken, type: auth.type });
      if (auth.type === 'admin') {
        for (const endpoint of endpoints.filter(o => o.type === 'admin' && o.nsp === socket.nsp.name)) {
          if (!Object.keys(socket._events).includes(endpoint.on)) {
            socket.on(endpoint.on, endpoint.callback);
          }
        }
      }
      for (const endpoint of endpoints.filter(o => o.type === 'viewer' && o.nsp === socket.nsp.name)) {
        if (!Object.keys(socket._events).includes(endpoint.on)) {
          socket.on(endpoint.on, endpoint.callback);
        }
      }

      // reauth every minute
      setTimeout(() => emitAuthorize(socket), MINUTE);
    }
    const emitAuthorize = (socket) => {
      socket.emit('authorize', (cb: { accessToken: string; refreshToken: string; }) => {
        if (cb.accessToken === '' || cb.refreshToken === '') {
          // we don't have anything
          return socket.emit('unauthorized')
        } else {
          const auth = sockets.find(o => (o.accessToken === cb.accessToken || o.refreshToken === cb.refreshToken) )
          if (!auth) {
            return socket.emit('unauthorized')
          } else {
            if (auth.accessToken === cb.accessToken) {
              // update refreshToken timestamp to expire only if not used
              auth.refreshTokenTimestamp = Date.now();
              sendAuthorized(socket, auth);
            } else {
              auth.accessToken = uuid();
              auth.accessTokenTimestamp = Date.now();
              auth.refreshTokenTimestamp = Date.now();
              sendAuthorized(socket, auth);
            }
          }
        }
      });
    }
    next();

    socket.on('newAuthorization', async (userId, cb) => {
      const userPermission = await global.permissions.getUserHighestPermission(userId);
      const auth: Auth = {
        accessToken: uuid(),
        refreshToken: uuid(),
        accessTokenTimestamp: Date.now(),
        refreshTokenTimestamp: Date.now(),
        userId,
        type: 'viewer'
      }
      if (userPermission === permission.CASTERS) {
        auth.type = 'admin'
      }
      sockets.push(auth);
      sendAuthorized(socket, auth);
      cb();
    })
    emitAuthorize(socket);

    for (const endpoint of endpoints.filter(o => o.type === 'public' && o.nsp === socket.nsp.name)) {
      if (!Object.keys(socket._events).includes(endpoint.on)) {
        socket.on(endpoint.on, endpoint.callback);
      }
    }
  }

  sockets () {
    global.panel.io.of('/core/socket').on('connection', (socket) => {
      socket.on('purgeAllConnections', (cb) => {
        sockets = [];
        cb(null);
      });
    });
  }
}

export default Socket;
export { adminEndpoint, viewerEndpoint, publicEndpoint, Socket };