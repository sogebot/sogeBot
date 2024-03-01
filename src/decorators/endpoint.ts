import { RouteParameters } from 'express-serve-static-core';

import { getNameAndTypeFromStackTrace } from '~/decorators.js';
import { isBotStarted } from '~/helpers/database.js';
import { error } from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import { find } from '~/helpers/register.js';
import { withScope } from '~/helpers/socket.js';

export function Post<T extends string>(endpoint: T, customEndpoint?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (_target: any, key: string, fnc: TypedPropertyDescriptor<(params?: RouteParameters<T>) => Promise<any>>) => {
    let retries = 0;

    const registerEndpoint = () => {
      if (!isBotStarted) {
        setTimeout(() => registerEndpoint(), 100);
        return;
      }

      if (retries > 120) {
        throw new Error('Failed to register endpoint');
      }
      const self = find(type as any, name) as typeof _target;
      if (!app || !self) {
        retries++;
        setTimeout(() => registerEndpoint(), 1000);
        return;
      }
      let generatedEndpoint = `/api${customEndpoint ? customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }
      app.post(generatedEndpoint, withScope([self.scope('manage')]), async (req, res) => {
        try {
          if (fnc.value) {
            try {
              const data = await fnc.value.bind(self)(req.body as any);
              res.send({
                status: 'success',
                data:   data,
              });
            } catch (e) {
              res.status(400).send({ status: 'error', errors: e });
            }
          } else {
            res.send({
              status:  'error',
              message: 'No function to call',
            }).status(500);
          }
        } catch (e) {
          error(e);
          res.send({
            status:  'error',
            message: 'Internal Server Error',
          }).status(500);
        }
      });
    };
    registerEndpoint();
  };
}

export function Get<T extends string>(endpoint: T, scope: 'public' | 'read' | 'manage', customEndpoint?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (_target: any, key: string, fnc: TypedPropertyDescriptor<(params?: RouteParameters<T>) => Promise<any>>) => {
    let retries = 0;

    const registerEndpoint = () => {
      if (!isBotStarted) {
        setTimeout(() => registerEndpoint(), 100);
        return;
      }

      if (retries > 120) {
        throw new Error('Failed to register endpoint');
      }
      const self = find(type as any, name) as typeof _target;
      if (!app || !self) {
        retries++;
        setTimeout(() => registerEndpoint(), 1000);
        return;
      }
      const scopes = scope === 'public'
        ? []
        : scope === 'read'
          ? [self.scope('read'), self.scope('manage')]
          : [self.scope('manage')];
      let generatedEndpoint = `/api${customEndpoint ? customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }
      app.get(generatedEndpoint, withScope(scopes), async (req, res) => {
        try {
          if (fnc.value) {
            const data = await fnc.value.bind(self)(req.params as any);
            res.send({
              status: 'success',
              data:   Array.isArray(data)
                ? {
                  items: data,
                } : data,
            });
          } else {
            res.send({
              status:  'error',
              message: 'No function to call',
            }).status(500);
          }
        } catch (e) {
          error(e);
          res.send({
            status:  'error',
            message: 'Internal Server Error',
          }).status(500);
        }
      });
    };
    registerEndpoint();
  };
}

export function Delete<T extends string>(endpoint: T, customEndpoint?: string) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (_target: any, key: string, fnc: TypedPropertyDescriptor<(params?: RouteParameters<T>) => Promise<any>>) => {
    let retries = 0;

    const registerEndpoint = () => {
      if (!isBotStarted) {
        setTimeout(() => registerEndpoint(), 100);
        return;
      }

      if (retries > 120) {
        throw new Error('Failed to register endpoint');
      }
      const self = find(type as any, name) as typeof _target;
      if (!app || !self) {
        retries++;
        setTimeout(() => registerEndpoint(), 1000);
        return;
      }
      let generatedEndpoint = `/api${customEndpoint ? customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }
      app.delete(generatedEndpoint, withScope([self.scope('manage')]), async (req, res) => {
        try {
          if (fnc.value) {
            await fnc.value.bind(self)(req.params as any);
            res.status(204).send();
          } else {
            res.send({
              status:  'error',
              message: 'No function to call',
            }).status(500);
          }
        } catch (e) {
          error(e);
          res.send({
            status:  'error',
            message: 'Internal Server Error',
          }).status(500);
        }
      });
    };
    registerEndpoint();
  };
}