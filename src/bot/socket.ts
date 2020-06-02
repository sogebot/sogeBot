import Core from './_interface';
import { settings, shared, ui } from './decorators';
import { isMainThread } from './cluster';
import { v4 as uuid } from 'uuid';
import { permission } from './helpers/permissions';
import { adminEndpoint, endpoints } from './helpers/socket';
import { onLoad } from './decorators/on';
import axios from 'axios';
import jwt from 'jsonwebtoken';

import { getRepository } from 'typeorm';
import permissions from './permissions';
import { debug } from './helpers/log';
import { app, ioServer } from './helpers/panel';
import { Dashboard } from './database/entity/dashboard';
import { isModerator } from './commons';
import { User } from './database/entity/user';
import { DAY } from './constants';
import { NextFunction } from 'express';

let _self: any = null;

enum Authorized {
  inProgress,
  NotAuthorized,
  isAuthorized,
}

type Unpacked<T> =
  T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer U ? U :
      T extends Promise<infer U> ? U :
        T;

const createDashboardIfNeeded = async (userId: number, opts: { haveAdminPrivileges: Authorized; haveModPrivileges: Authorized; haveViewerPrivileges: Authorized }) => {
  // create main admin dashboard if needed;
  if (opts.haveAdminPrivileges === Authorized.isAuthorized) {
    const mainDashboard = await getRepository(Dashboard).findOne({
      userId, name: 'Main', type: 'admin',
    });
    if (!mainDashboard) {
      await getRepository(Dashboard).save({
        name: 'Main', createdAt: 0, userId, type: 'admin',
      });
    }
  }

  // create main admin dashboard if needed;
  if (opts.haveModPrivileges === Authorized.isAuthorized) {
    const mainDashboard = await getRepository(Dashboard).findOne({
      userId, name: 'Main', type: 'mod',
    });
    if (!mainDashboard) {
      await getRepository(Dashboard).save({
        name: 'Main', createdAt: 0, userId, type: 'mod',
      });
    }
  }

  // create main viewer dashboard if needed;
  if (opts.haveViewerPrivileges === Authorized.isAuthorized) {
    const mainDashboard = await getRepository(Dashboard).findOne({
      userId, name: 'Main', type: 'viewer',
    });
    if (!mainDashboard) {
      await getRepository(Dashboard).save({
        name: 'Main', createdAt: 0, userId, type: 'viewer',
      });
    }
  }
};

const getPrivileges = async(type: 'admin' | 'viewer' | 'public', userId: number) => {
  try {
    const user = await getRepository(User).findOneOrFail({ userId });
    return {
      haveAdminPrivileges: type === 'admin' ? Authorized.isAuthorized : Authorized.NotAuthorized,
      haveModPrivileges: isModerator(user) ? Authorized.isAuthorized : Authorized.NotAuthorized,
      haveViewerPrivileges: Authorized.isAuthorized,
    };
  } catch (e) {
    return {
      haveAdminPrivileges: Authorized.NotAuthorized,
      haveModPrivileges: Authorized.NotAuthorized,
      haveViewerPrivileges: Authorized.NotAuthorized,
    };
  }
};

const initEndpoints = async(socket: SocketIO.Socket, privileges: Unpacked<ReturnType<typeof getPrivileges>>) => {
  for (const key of [...new Set(endpoints.filter(o => o.nsp === socket.nsp.name).map(o => o.nsp + '||' + o.on))]) {
    const [nsp, on] = key.split('||');
    const endpointsToInit = endpoints.filter(o => o.nsp === nsp && o.on === on);
    socket.removeAllListeners(on); // remove all listeners in case we call this twice

    socket.on(on, async (opts: any, cb: (error: Error | string | null, ...response: any) => void) => {
      const adminEndpointInit = endpointsToInit.find(o => o.type === 'admin');
      const viewerEndpoint = endpointsToInit.find(o => o.type === 'viewer');
      const publicEndpoint = endpointsToInit.find(o => o.type === 'public');
      if (adminEndpointInit && privileges.haveAdminPrivileges) {
        adminEndpointInit.callback(opts, cb, socket);
        return;
      } else if (!viewerEndpoint && !publicEndpoint) {
        debug('sockets', `User dont have admin access to ${socket.nsp.name}`);
        debug('sockets', privileges);
        cb('User doesn\'t have access to this endpoint', null);
        return;
      }

      if (viewerEndpoint && privileges.haveViewerPrivileges) {
        viewerEndpoint.callback(opts, cb, socket);
        return;
      } else if (!publicEndpoint) {
        debug('sockets', `User dont have viewer access to ${socket.nsp.name}`);
        debug('sockets', privileges);
        cb('User doesn\'t have access to this endpoint', null);
        return;
      }

      publicEndpoint.callback(opts, cb, socket);
    });
  }
};

class Socket extends Core {
  @shared(true)
  JWTKey = '';

  @settings('connection')
  accessTokenExpirationTime = 120;

  @settings('connection')
  refreshTokenExpirationTime = DAY * 31;

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

  @onLoad('JWTKey')
  JWTKeyGenerator() {
    if (this.JWTKey === '') {
      this.JWTKey = uuid();
    }
  }

  constructor() {
    super();

    if (isMainThread) {
      const init = (retry = 0) => {
        if (retry === 10000) {
          throw new Error('Socket oauth validate endpoint failed.');
        } else if (!app) {
          setTimeout(() => init(retry++), 100);
        } else {
          debug('ui', 'Socket oauth validate endpoint OK.');
          app.get('/socket/validate', async (req, res) => {
            const accessTokenHeader = req.headers['x-twitch-token'] as string | undefined;
            const userId = req.headers['x-twitch-userid'] as string | undefined;

            try {
              if (!accessTokenHeader || !userId) {
                throw new Error('Insufficient data');
              }
              const twitchValidation = await axios.get(`https://id.twitch.tv/oauth2/validate`, {
                headers: {
                  'Authorization': 'OAuth ' + accessTokenHeader,
                },
              });
              if (userId !== twitchValidation.data.user_id) {
                throw new Error('Not matching userId');
              }
              const username = twitchValidation.data.login;
              const haveCasterPermission = (await permissions.check(Number(userId), permission.CASTERS, true)).access;
              const user = await getRepository(User).findOne({ userId: Number(userId) });
              await getRepository(User).save({
                ...user,
                userId: Number(userId),
                username,
              });

              const accessToken = jwt.sign({
                userId: Number(userId),
                username,
                privileges: await getPrivileges(haveCasterPermission ? 'admin' : 'viewer', Number(userId)),
              }, this.JWTKey, { expiresIn: `${this.accessTokenExpirationTime}s` });
              const refreshToken = jwt.sign({
                userId: Number(userId),
                username,
              }, this.JWTKey, { expiresIn: `${this.refreshTokenExpirationTime}s` });
              res.status(200).send({accessToken, refreshToken, userType: haveCasterPermission ? 'admin' : 'viewer'});
            } catch(e) {
              debug('socket', e.stack);
              res.status(400).send('You don\'t have access to this server.');
            }
          });
          app.get('/socket/refresh', async (req, res) => {
            const refreshTokenHeader = req.headers['x-twitch-token'] as string | undefined;

            try {
              if (!refreshTokenHeader) {
                throw new Error('Insufficient data');
              }
              const data = jwt.verify(refreshTokenHeader, this.JWTKey) as {
                userId: number; username: string;
              };
              const userPermission = await permissions.getUserHighestPermission(Number(data.userId));
              const user = await getRepository(User).findOne({ userId: Number(data.userId) });
              await getRepository(User).save({
                ...user,
                userId: Number(data.userId),
                username: data.username,
              });

              const accessToken = jwt.sign({
                userId: Number(data.userId),
                username: data.username,
                privileges: await getPrivileges(userPermission === permission.CASTERS ? 'admin' : 'viewer', Number(data.userId)),
              }, this.JWTKey, { expiresIn: `${this.accessTokenExpirationTime}s` });
              const refreshToken = jwt.sign({
                userId: Number(data.userId),
                username: data.username,
              }, this.JWTKey, { expiresIn: `${this.refreshTokenExpirationTime}s` });
              res.status(200).send({accessToken, refreshToken, userType: userPermission === permission.CASTERS ? 'admin' : 'viewer'});
            } catch(e) {
              debug('socket', e.stack);
              res.status(400).send('You don\'t have access to this server.');
            }
          });
        }
      };
      init();
    }
  }

  async authorize(socket: SocketIO.Socket, next: NextFunction) {
    // first check if token is socketToken
    if (socket.handshake.query.token === this.socketToken) {
      initEndpoints(socket, { haveAdminPrivileges: Authorized.isAuthorized, haveModPrivileges: Authorized.isAuthorized, haveViewerPrivileges: Authorized.isAuthorized });
    } else {
      if (socket.handshake.query.token !== '' && socket.handshake.query.token !== 'null') {
        try {
          const token = jwt.verify(socket.handshake.query.token, _self.JWTKey) as {
            userId: number; username: string; privileges: Unpacked<ReturnType<typeof getPrivileges>>;
          };
          debug('socket', JSON.stringify(token, null, 4));
          await createDashboardIfNeeded(token.userId, token.privileges);
          initEndpoints(socket, token.privileges);
        } catch (e) {
          next(Error(e));
          return;
        }
      } else {
        initEndpoints(socket, { haveAdminPrivileges: Authorized.NotAuthorized, haveModPrivileges: Authorized.NotAuthorized, haveViewerPrivileges: Authorized.NotAuthorized });
        setTimeout(() => socket.emit('forceDisconnect'), 1000); // force disconnect if we must be logged in
      }
    }
    next();
  }

  sockets () {
    adminEndpoint(this.nsp, 'purgeAllConnections', (cb, socket) => {
      this.JWTKey = uuid();
      ioServer?.emit('forceDisconnect');
      initEndpoints(socket, { haveAdminPrivileges: Authorized.NotAuthorized, haveModPrivileges: Authorized.NotAuthorized, haveViewerPrivileges: Authorized.NotAuthorized });
      cb(null);
    });
  }

  @onLoad('socketToken')
  generateSocketTokenIfNeeded() {
    if (this.socketToken === '') {
      this.socketToken = uuid();
    }
  }
}

_self = new Socket();
export default _self;
export { Socket };