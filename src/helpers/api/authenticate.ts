import * as express from 'express';
import * as jwt from 'jsonwebtoken';

import { UnauthorizedError } from '../errors';

export function expressAuthentication(
  req: express.Request,
  securityName: string,
  scopes?: any,
): Promise<any> {
  if (securityName === 'bearerAuth') {
    const { authorization } = req.headers;
    if (!authorization) {
      return Promise.reject(new UnauthorizedError('You must send an Authorization header'));
    }

    const [authType, token] = authorization.trim().split(' ');
    if (authType !== 'Bearer') {
      return Promise.reject(new UnauthorizedError('Expected a Bearer token'));
    }
    const JWTKey = require('../../socket').default.JWTKey;
    const validatedToken = jwt.verify(token, JWTKey) as {
      userId: string; username: string; privileges: any;
    };

    if (validatedToken.privileges.haveAdminPrivileges !== 2 /* authorized */) {
      return Promise.reject(new UnauthorizedError('You don\'t have permission to access this resource.'));
    }

    return Promise.resolve({
      userId:   validatedToken.userId,
      username: validatedToken.username,
    });
  }
  return Promise.resolve({});
}