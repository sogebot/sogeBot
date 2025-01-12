import { randomUUID } from 'node:crypto';

import axios from 'axios';
import { NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Socket as SocketIO } from 'socket.io';

import { Post } from './decorators/endpoint.js';
import { DAY } from './helpers/constants.js';

import Core from '~/_interface.js';
import { onLoad } from '~/decorators/on.js';
import {
  persistent, settings, ui,
} from '~/decorators.js';
import { debug, error } from '~/helpers/log.js';
import { app, ioServer } from '~/helpers/panel.js';
import { check } from '~/helpers/permissions/check.js';
import { defaultPermissions } from '~/helpers/permissions/defaultPermissions.js';
import { getUserHighestPermission } from '~/helpers/permissions/getUserHighestPermission.js';
import { getPrivileges, initEndpoints, scopes } from '~/helpers/socket.js';
import * as changelog from '~/helpers/user/changelog.js';

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
      this.JWTKey = randomUUID();
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

          debug('socket', 'Validation started');
          debug('socket', JSON.stringify({ accessTokenHeader, userId }, null, 2));
          try {
            if (!accessTokenHeader || !userId) {
              throw new Error('Insufficient data');
            }
            const twitchValidation = await axios.get<any>(`https://id.twitch.tv/oauth2/validate`, { headers: { 'Authorization': 'Bearer ' + accessTokenHeader } });
            if (userId !== twitchValidation.data.user_id) {
              throw new Error('Not matching userId');
            }
            const userName = twitchValidation.data.login;
            const haveCasterPermission = (await check(userId, defaultPermissions.CASTERS, true)).access;
            const user = await changelog.get(userId);
            changelog.update(userId, {
              ...user,
              userId,
              userName,
            });

            const accessToken = jwt.sign({
              userId,
              userName,
              privileges: await getPrivileges(userId),
            }, this.JWTKey, { expiresIn: `${this.accessTokenExpirationTime}s` });
            const refreshToken = jwt.sign({
              userId,
              userName,
            }, this.JWTKey, { expiresIn: `${this.refreshTokenExpirationTime}s` });
            res.status(200).send({
              accessToken, refreshToken, userType: haveCasterPermission ? 'admin' : 'viewer',
            });
          } catch(e: any) {
            error(e.stack);
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
            const user = await changelog.get(data.userId);
            changelog.update(data.userId, {
              ...user,
              ...data,
            });

            const accessToken = jwt.sign({
              userId:     data.userId,
              username:   data.username,
              privileges: await getPrivileges(data.userId),
            }, this.JWTKey, { expiresIn: `${this.accessTokenExpirationTime}s` });
            const refreshToken = jwt.sign({
              userId:   data.userId,
              username: data.username,
            }, this.JWTKey, { expiresIn: `${this.refreshTokenExpirationTime}s` });
            const payload = {
              accessToken, refreshToken, userType: userPermission.id === defaultPermissions.CASTERS ? 'admin' : 'viewer',
            };
            debug('socket', '/socket/refresh ->');
            debug('socket', JSON.stringify(payload, null, 2));
            res.status(200).send(payload);
          } catch(e: any) {
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
        haveAdminPrivileges:    true,
        excludeSensitiveScopes: false,
        scopes:                 Array.from(scopes), // allow all scopes
      });
    } else {
      if (authToken !== '' && authToken !== null) {
        try {
          const token = jwt.verify(authToken, _self.JWTKey) as {
            userId: string; username: string; privileges: Unpacked<ReturnType<typeof getPrivileges>>;
          };
          debug('socket', JSON.stringify(token, null, 4));
          initEndpoints(socket, token.privileges);
        } catch (e: any) {
          if (e instanceof jwt.JsonWebTokenError) {
            error('Used token for authorization is malformed or invalid: ' + e.message);
            debug('socket', e.stack);
          } else if (e instanceof Error) {
            debug('socket', e.stack);
          }
          next(Error(e));
          return;
        }
      } else {
        initEndpoints(socket, {
          haveAdminPrivileges: false, excludeSensitiveScopes: true, scopes: [],
        });
        debug('socket', `Authorize endpoint failed with token '${authToken}'`);
        setTimeout(() => socket.emit('forceDisconnect'), 1000); // force disconnect if we must be logged in
      }
    }
    setTimeout(() => next(), 100);
  }

  @Post('/purgeAllConnections')
  async purgeAllConnections () {
    this.JWTKey = randomUUID();
    ioServer?.emit('forceDisconnect');
  }

  @onLoad('socketToken')
  generateSocketTokenIfNeeded() {
    if (this.socketToken === '') {
      this.socketToken = randomUUID();
    }
  }
}

const processAuth = (req: { headers: { [x: string]: any; }; }, res: { sendStatus: (arg0: number) => any; }, next: () => void) => {
  req.headers.adminAccess = false;

  try {
    const authHeader = req.headers.authorization;
    const authToken = authHeader && authHeader.split(' ')[1];

    if (authToken === _self.socketToken) {
      req.headers.adminAccess = true;
      return next();
    }

    if (authToken == null) {
      return next();
    }

    const token = jwt.verify(authToken, _self.JWTKey) as {
      userId: string; username: string; privileges: Unpacked<ReturnType<typeof getPrivileges>>;
    };

    if (token.privileges.scopes) {
      req.headers.scopes = token.privileges.scopes;
    }
  } catch {
    null;
  }
  next();
};

const _self = new Socket();
export default _self;
export { Socket, getPrivileges, processAuth };