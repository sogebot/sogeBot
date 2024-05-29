import { ZodError, ZodObject } from 'zod';

import { getNameAndTypeFromStackTrace } from '~/decorators.js';
import { isBotStarted } from '~/helpers/database.js';
import { error } from '~/helpers/log.js';
import { app } from '~/helpers/panel.js';
import { find } from '~/helpers/register.js';
import { addScope, withScope } from '~/helpers/socket.js';

const registeredEndpoint: {
  [endpoint: string]: {
    [action: string]: {
      fnc?: (req?: any) => Promise<any>,
      zodValidator: ZodObject<any> | undefined,
    },
  }
} = {};

export function Post<T extends string>(endpoint: T, params: {
  customEndpoint?: string, zodValidator?: ZodObject<any>, action?: string, isSensitive?: boolean
} = {}) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (_target: any, key: string, fnc: TypedPropertyDescriptor<(req?: any) => Promise<any>>) => {
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
      let generatedEndpoint = `/api${params.customEndpoint ? params.customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }

      const endpointIsRegistered = generatedEndpoint in registeredEndpoint;
      // initialize endpoint if not already initialized
      if (!endpointIsRegistered) {
        registeredEndpoint[generatedEndpoint] = {};
      }
      // register endpoint action
      registeredEndpoint[generatedEndpoint][params.action ?? 'default'] = {
        fnc:          fnc.value,
        zodValidator: params.zodValidator,
      };

      if (endpointIsRegistered) {
        return; // endpoint is already registered and we already have handler below
      }

      // change scopes to sensitive if we are handling logins or sensitive data endpoints
      const scopes = params.isSensitive ? [self.scope('sensitive')] : [self.scope('manage')];
      if (params.isSensitive) {
      // add sensitive scope
        if (type === 'integrations' || type === 'services') {
          addScope(`${type}:sensitive`);
        } else {
          addScope(`${name.toLowerCase()}:sensitive`);
        }
      }

      app.post(generatedEndpoint, withScope(scopes), async (req, res) => {
        try {
          const endpointHandler = registeredEndpoint[generatedEndpoint][req.query._action as string ?? 'default'];
          if (!endpointHandler) {
            res.send({
              status:  'error',
              message: `_action ${req.query._action} not found`,
            }).status(400);
            return;
          }

          if (endpointHandler.fnc) {
            try {
              if (req.body._schema) {
                delete req.body._schema;
              }

              if (endpointHandler.zodValidator) {
                endpointHandler.zodValidator.parse(req.body);
              }

              const data = await endpointHandler.fnc.bind(self)(req);
              if (data === undefined) {
                res.send({
                  status: 'success',
                });
              } else {
                res.send({
                  status: 'success',
                  data:   data,
                });
              }
            } catch (e) {
              if (e instanceof ZodError) {
                res.status(400).send({ status: 'invalid-data', errors: e.errors });
              } else {
                res.status(400).send({ status: 'error', errors: e instanceof Error ? e.message : e });
              }
            }
          } else {
            res.status(500).send({
              status:  'error',
              message: 'No function to call',
            });
          }
        } catch (e) {
          error(e);
          res.status(500).send({
            status:  'error',
            message: 'Internal Server Error',
          });
        }
      });
    };
    registerEndpoint();
  };
}

export function Get<T extends string>(endpoint: T, params: {
  scope?: 'public' | 'read' | 'manage',
  isSensitive?: boolean,
  scopeOrigin?: string
  customEndpoint?: string
} = {}) {
  const { name, type } = getNameAndTypeFromStackTrace();

  params.scope ??= 'read'; // default to read scope

  return (_target: any, key: string, fnc: TypedPropertyDescriptor<(req?: any) => Promise<any>>) => {
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
      let scopes: string[] = [];

      // if scopeOrigin is present, use it
      if (params.scopeOrigin) {
        if (params.scope === 'read') {
          scopes = [`${params.scopeOrigin}:${params.scope}`, `${params.scopeOrigin}:manage`];
        }
        if (params.scope === 'manage') {
          scopes = [`${params.scopeOrigin}:${params.scope}`];
        }
        if (params.isSensitive) {
          scopes = [`${params.scopeOrigin}:sensitive`];
        }
      } else {
        scopes = params.scope === 'public'
          ? []
          : params.scope === 'read' || typeof params.scope === 'undefined'
            ? [self.scope('read'), self.scope('manage')]
            : [self.scope('manage')];
        if (params.isSensitive) {
          scopes = [self.scope('sensitive')];
        }
      }
      let generatedEndpoint = `/api${params.customEndpoint ? params.customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }
      app.get(generatedEndpoint, withScope(scopes, params.scope === 'public'), async (req, res) => {
        try {
          if (fnc.value) {
            const data = await fnc.value.bind(self)(req);

            // if no data and params are present, return 404
            if (data === null && Object.keys(req.params).length > 0) {
              throw new Error('404');
            }

            if ('_raw' in req.query) {
              res.send(data);
            } else {
              res.send({
                status: 'success',
                data,
              });
            }
          } else {
            res.status(500).send({
              status:  'error',
              message: 'No function to call',
            });
          }
        } catch (e) {
          if (e instanceof Error && e.message === '404') {
            res.status(404).send({ status: 'error', message: 'Not found' });
            return;
          }
          error(e);
          res.status(500).send({
            status:  'error',
            message: 'Internal Server Error',
          });
        }
      });
    };
    registerEndpoint();
  };
}

export function Delete<T extends string>(endpoint: T, params: { customEndpoint?: string, isSensitive?: boolean } = {}) {
  const { name, type } = getNameAndTypeFromStackTrace();

  return (_target: any, key: string, fnc: TypedPropertyDescriptor<(req?: any) => Promise<any>>) => {
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
      let generatedEndpoint = `/api${params.customEndpoint ? params.customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }
      app.delete(generatedEndpoint, withScope([self.scope(params.isSensitive ? 'sensitive' : 'manage')]), async (req, res) => {
        try {
          if (fnc.value) {
            await fnc.value.bind(self)(req);
            res.status(204).send();
          } else {
            res.status(500).send({
              status:  'error',
              message: 'No function to call',
            });
          }
        } catch (e) {
          error(e);
          res.status(500).send({
            status:  'error',
            message: 'Internal Server Error',
          });
        }
      });
    };
    registerEndpoint();
  };
}