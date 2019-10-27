import Core from './_interface';
import { settings, ui, shared } from './decorators';
import { MINUTE, SECOND } from './constants';
import { isMainThread } from 'worker_threads';
import uuid from 'uuid/v4';
import { permission } from './helpers/permissions';
import { endpoints } from './helpers/socket';
import { onLoad } from './decorators/on';

type Auth = {
  userId: string;
  type: 'admin' | 'viewer' | 'public';
  accessToken: string | null;
  accessTokenTimestamp: number;
  refreshToken: string;
  refreshTokenTimestamp: number;
};

class Socket extends Core {
  @shared(true)
  socketsTokenAuthList: Auth[] = [];

  @settings('connection')
  accessTokenExpirationTime = 120;

  @settings('connection')
  refreshTokenExpirationTime = 604800;

  @settings('connection')
  @ui({
    type: 'uuid-generator',
  }, 'connection')
  socketToken = '';

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
        this.socketsTokenAuthList = this.socketsTokenAuthList.filter(socket => {
          const isAccessTokenExpired = socket.accessTokenTimestamp + (this.accessTokenExpirationTime * 1000) < Date.now();
          const isRefreshTokenExpired = socket.refreshTokenTimestamp + (this.refreshTokenExpirationTime * 1000) < Date.now();
          return !(isRefreshTokenExpired && isAccessTokenExpired);
        });
      }, MINUTE);

      setInterval(() => {
        this.socketsTokenAuthList = this.socketsTokenAuthList.map(socket => {
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
          socket.removeAllListeners(endpoint.on);
          socket.on(endpoint.on, (...args) => {
            endpoint.callback(...args, socket);
          });
        }
      }
      for (const endpoint of endpoints.filter(o => o.type === 'viewer' && o.nsp === socket.nsp.name)) {
        socket.removeAllListeners(endpoint.on);
        socket.on(endpoint.on, (...args) => {
          endpoint.callback(...args, socket);
        });
      }

      // reauth every minute
      setTimeout(() => emitAuthorize(socket), MINUTE);
    };
    const emitAuthorize = (socket) => {
      socket.emit('authorize', (cb: { accessToken: string; refreshToken: string; socketToken?: string }) => {
        if (cb.socketToken) {
          // check if we have global socket
          if (cb.accessToken === this.socketToken) {
            sendAuthorized(socket, {
              type: 'admin',
              accessToken: this.socketToken,
              refreshToken: '',
              accessTokenTimestamp: 0,
              refreshTokenTimestamp: 0,
            });
            return;
          }
          return socket.emit('unauthorized');
        }

        if (cb.accessToken === '' || cb.refreshToken === '') {
          // we don't have anything
          return socket.emit('unauthorized');
        } else {
          const auth = global.socket.socketsTokenAuthList.find(o => (o.accessToken === cb.accessToken || o.refreshToken === cb.refreshToken));
          if (!auth) {
            return socket.emit('unauthorized');
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
    };
    next();

    socket.on('newAuthorization', async (userId, cb) => {
      const userPermission = await global.permissions.getUserHighestPermission(userId);
      const auth: Auth = {
        accessToken: uuid(),
        refreshToken: uuid(),
        accessTokenTimestamp: Date.now(),
        refreshTokenTimestamp: Date.now(),
        userId,
        type: 'viewer',
      };
      if (userPermission === permission.CASTERS) {
        auth.type = 'admin';
      }
      global.socket.socketsTokenAuthList.push(auth);
      sendAuthorized(socket, auth);
      cb();
    });
    emitAuthorize(socket);

    for (const endpoint of endpoints.filter(o => o.type === 'public' && o.nsp === socket.nsp.name)) {
      socket.removeAllListeners(endpoint.on);
      socket.on(endpoint.on, (...args) => {
        endpoint.callback(...args, socket);
      });
    }
  }

  sockets () {
    global.panel.io.of('/core/socket').on('connection', (socket) => {
      socket.on('purgeAllConnections', (cb) => {
        this.socketsTokenAuthList = [];
        cb(null);
      });
    });
  }

  @onLoad('socketToken')
  generateSocketTokenIfNeeded() {
    if (this.socketToken === '') {
      this.socketToken = uuid();
    }
  }
}

export default Socket;
export { Socket };