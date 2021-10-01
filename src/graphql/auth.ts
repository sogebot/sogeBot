import jwt from 'jsonwebtoken';
import { AuthChecker } from 'type-graphql';

import socket, { getPrivileges } from '../socket.js';

type Unpacked<T> =
  T extends (infer U)[] ? U :
    T extends (...args: any[]) => infer R ? R :
      T extends Promise<infer E> ? E :
        T;

export const customAuthChecker: AuthChecker<any> = (
  { root, args, context, info },
  roles,
) => {
  // here we can read the user from context
  // and check his permission in the db against the `roles` argument
  // that comes from the `@Authorized` decorator, eg. ["ADMIN", "MODERATOR"]

  try {
    jwt.verify(context.headers.authorization.replace('Bearer ', ''), socket.JWTKey) as {
      userId: string; username: string; privileges: Unpacked<ReturnType<typeof getPrivileges>>;
    };
    return true; // or false if access is denied
  } catch {
    return false;
  }
};