import { DAY } from '@sogebot/ui-helpers/constants';
import axios from 'axios';
import { NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Socket as SocketIO } from 'socket.io';
import { getRepository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import Core from './_interface';
import { User } from './database/entity/user';
import {
  persistent, settings, ui,
} from './decorators';
import { onLoad } from './decorators/on';
import { debug } from './helpers/log';
import { app, ioServer } from './helpers/panel';
import {
  check, defaultPermissions, getUserHighestPermission,
} from './helpers/permissions/';
import { adminEndpoint, endpoints } from './helpers/socket';
import { isModerator } from './helpers/user/isModerator';

let _self: any = null;

enum Authorized {
  inProgress,
  NotAuthorized,
  isAuthorized,
}

type Unpacked<T> =
  T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer R ? R :
      T extends Promise<infer E> ? E :
        T;

const getPrivileges = async(type: 'admin' | 'viewer' | 'public', userId: string) => {
  try {
    const user = await getRepository(User).findOneOrFail({ userId });
    return {
      haveAdminPrivileges:  type === 'admin' ? Authorized.isAuthorized : Authorized.NotAuthorized,
      haveModPrivileges:    isModerator(user) ? Authorized.isAuthorized : Authorized.NotAuthorized,
      haveViewerPrivileges: Authorized.isAuthorized,
    };
  } catch (e) {
    return {
      haveAdminPrivileges:  Authorized.NotAuthorized,
      haveModPrivileges:    Authorized.NotAuthorized,
      haveViewerPrivileges: Authorized.NotAuthorized,
    };
  }
};

const initEndpoints = async(socket: SocketIO, privileges: Unpacked<ReturnType<typeof getPrivileges>>) => {
  for (const key of [...new Set(endpoints.filter(o => o.nsp === socket.nsp.name).map(o => o.nsp + '||' + o.on))]) {
    const [nsp, on] = key.split('||');
    const endpointsToInit = endpoints.filter(o => o.nsp === nsp && o.on === on);
    socket.offAny(); // remove all listeners in case we call this twice

    socket.on(on, async (opts: any, cb: (error: Error | string | null, ...response: any) => void) => {
      const adminEndpointInit = endpointsToInit.find(o => o.type === 'admin');
      const viewerEndpoint = endpointsToInit.find(o => o.type === 'viewer');
      const publicEndpoint = endpointsToInit.find(o => o.type === 'public');
      if (adminEndpointInit && privileges.haveAdminPrivileges) {
        adminEndpointInit.callback(opts, cb ?? socket, socket);
        return;
      } else if (!viewerEndpoint && !publicEndpoint) {
        debug('sockets', `User dont have admin access to ${socket.nsp.name}`);
        debug('sockets', privileges);
        cb('User doesn\'t have access to this endpoint', null);
        return;
      }

      if (viewerEndpoint && privileges.haveViewerPrivileges) {
        viewerEndpoint.callback(opts, cb ?? socket, socket);
        return;
      } else if (!publicEndpoint) {
        debug('sockets', `User dont have viewer access to ${socket.nsp.name}`);
        debug('sockets', privileges);
        cb('User doesn\'t have access to this endpoint', null);
        return;
      }

      publicEndpoint.callback(opts, cb ?? socket, socket);
    });
  }
};

class Socket extends Core {
  @persistent()
  JWTKey = '';

  @settings('connection')
  accessTokenExpirationTime = DAY;

  @settings('connection')
  refreshTokenExpirationTime = DAY * 31;

  @settings('connection')
  @ui({ type: 'uuid-generator' }, 'connection')
  socketToken = '';

  @onLoad('JWTKey')
  JWTKeyGenerator() {
    if (this.JWTKey === '') {
      this.JWTKey = uuid();
    }
  }

  constructor() {
    super();

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
            const twitchValidation = await axios.get(`https://id.twitch.tv/oauth2/validate`, { headers: { 'Authorization': 'OAuth ' + accessTokenHeader } });
            if (userId !== twitchValidation.data.user_id) {
              throw new Error('Not matching userId');
            }
            const username = twitchValidation.data.login;
            const haveCasterPermission = (await check(userId, defaultPermissions.CASTERS, true)).access;
            const user = await getRepository(User).findOne({ userId });
            await getRepository(User).save({
              ...user,
              userId,
              username,
            });

            const accessToken = jwt.sign({
              userId:     Number(userId),
              username,
              privileges: await getPrivileges(haveCasterPermission ? 'admin' : 'viewer', userId),
            }, this.JWTKey, { expiresIn: `${this.accessTokenExpirationTime}s` });
            const refreshToken = jwt.sign({
              userId,
              username,
            }, this.JWTKey, { expiresIn: `${this.refreshTokenExpirationTime}s` });
            res.status(200).send({
              accessToken, refreshToken, userType: haveCasterPermission ? 'admin' : 'viewer',
            });
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
              userId: string; username: string;
            };
            const userPermission = await getUserHighestPermission(data.userId);
            const user = await getRepository(User).findOne({ userId: data.userId });
            await getRepository(User).save({
              ...user,
              userId:   data.userId,
              username: data.username,
            });

            const accessToken = jwt.sign({
              userId:     data.userId,
              username:   data.username,
              privileges: await getPrivileges(userPermission === defaultPermissions.CASTERS ? 'admin' : 'viewer', data.userId),
            }, this.JWTKey, { expiresIn: `${this.accessTokenExpirationTime}s` });
            const refreshToken = jwt.sign({
              userId:   data.userId,
              username: data.username,
            }, this.JWTKey, { expiresIn: `${this.refreshTokenExpirationTime}s` });
            res.status(200).send({
              accessToken, refreshToken, userType: userPermission === defaultPermissions.CASTERS ? 'admin' : 'viewer',
            });
          } catch(e) {
            debug('socket', e.stack);
            res.status(400).send('You don\'t have access to this server.');
          }
        });
      }
    };
    init();
  }

  async authorize(socket: SocketIO, next: NextFunction) {
    const authToken = (socket.handshake.auth as any).token;
    // first check if token is socketToken
    if (authToken === this.socketToken) {
      initEndpoints(socket, {
        haveAdminPrivileges: Authorized.isAuthorized, haveModPrivileges: Authorized.isAuthorized, haveViewerPrivileges: Authorized.isAuthorized,
      });
    } else {
      if (authToken !== '' && authToken !== null) {
        try {
          const token = jwt.verify(authToken, _self.JWTKey) as {
            userId: string; username: string; privileges: Unpacked<ReturnType<typeof getPrivileges>>;
          };
          debug('socket', JSON.stringify(token, null, 4));
          initEndpoints(socket, token.privileges);
        } catch (e) {
          next(Error(e));
          return;
        }
      } else {
        initEndpoints(socket, {
          haveAdminPrivileges: Authorized.NotAuthorized, haveModPrivileges: Authorized.NotAuthorized, haveViewerPrivileges: Authorized.NotAuthorized,
        });
        setTimeout(() => socket.emit('forceDisconnect'), 1000); // force disconnect if we must be logged in
      }
    }
    next();
  }

  sockets () {
    adminEndpoint(this.nsp, 'purgeAllConnections', (cb, socket) => {
      this.JWTKey = uuid();
      ioServer?.emit('forceDisconnect');
      initEndpoints(socket, {
        haveAdminPrivileges: Authorized.NotAuthorized, haveModPrivileges: Authorized.NotAuthorized, haveViewerPrivileges: Authorized.NotAuthorized,
      });
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