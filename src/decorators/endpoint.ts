import { ZodError, ZodTypeAny } from 'zod';

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
      zodValidator: ZodTypeAny | undefined,
    },
  }
} = {};

export class ErrorNotFound extends Error {
  constructor(message?: string) {
    // Pass the error message to the parent Error class
    super(message);
    // Set the name property to this specific error class name
    this.name = 'ErrorNotFound';

    // Maintain proper stack trace (only available in V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorNotFound);
    }
  }
}

export class ErrorBadRequest extends Error {
  constructor(message: string) {
    // Pass the error message to the parent Error class
    super(message);
    // Set the name property to this specific error class name
    this.name = 'ErrorBadRequest';

    // Maintain proper stack trace (only available in V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorBadRequest);
    }
  }
}

export class ErrorInternalServer extends Error {
  constructor(message: string) {
    // Pass the error message to the parent Error class
    super(message);
    // Set the name property to this specific error class name
    this.name = 'ErrorInternalServer';

    // Maintain proper stack trace (only available in V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorInternalServer);
    }
  }
}

export function Post<T extends string>(endpoint: T, params: {
  /** public or manage (you cannot mismatch different scope, if it is public, you need to handle auth yourself) */
  scope?: 'public' | 'manage',
  customEndpoint?: string,
  zodValidator?: ZodTypeAny,
  action?: string,
  isSensitive?: boolean,
  scopeOrigin?: string
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

      let scopes: string[] = [];

      // if scopeOrigin is present, use it
      if (params.scopeOrigin) {
        scopes = params.scope === 'public' ? [] : [`${params.scopeOrigin}:manage`];
        if (params.isSensitive) {
          scopes = [`${params.scopeOrigin}:sensitive`];
        }
      } else {
        scopes =[self.scope('manage')];
        if (params.isSensitive) {
          scopes = [self.scope('sensitive')];
        }
        if (params.scope === 'public') {
          scopes = [];
        }
      }

      for (const scope of scopes) {
        if (scope.includes('sensitive')) {
          if (type === 'integrations' || type === 'services') {
            addScope(`${type}:sensitive`);
          } else {
            addScope(`${name}`);
          }
        }
      }

      for (const scope of scopes) {
        addScope(scope);
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
              if (e instanceof ErrorBadRequest) {
                res.status(400).send({ status: 'error', message: e.message });
                return;
              }
              if (e instanceof ErrorInternalServer) {
                error(e.stack ?? e.message);
                res.status(500).send({ status: 'error', message: 'Internal Server Error. Check your bot logs.' });
                return;
              }
              if (e instanceof ErrorNotFound) {
                res.status(404).send({ status: 'error', message: 'Not found' });
                return;
              }
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

export function Patch<T extends string>(endpoint: T, params: {
  isSensitive?: boolean,
  scopeOrigin?: string
  customEndpoint?: string
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
      let scopes: string[] = [];

      // if scopeOrigin is present, use it
      if (params.scopeOrigin) {
        scopes = [`${params.scopeOrigin}:manage`];
        if (params.isSensitive) {
          scopes = [`${params.scopeOrigin}:sensitive`];
        }
      } else {
        scopes =[self.scope('manage')];
        if (params.isSensitive) {
          scopes = [self.scope('sensitive')];
        }
      }
      let generatedEndpoint = `/api${params.customEndpoint ? params.customEndpoint : self.nsp as string}${endpoint}`;
      // if ends with /, remove it
      if (generatedEndpoint.endsWith('/')) {
        generatedEndpoint = generatedEndpoint.slice(0, -1);
      }

      for (const scope of scopes) {
        addScope(scope);
      }
      app.patch(generatedEndpoint, withScope(scopes), async (req, res) => {
        try {
          if (fnc.value) {
            const data = await fnc.value.bind(self)(req);

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
          if (e instanceof ErrorNotFound) {
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

      for (const scope of scopes) {
        addScope(scope);
      }
      app.get(generatedEndpoint, withScope(scopes, params.scope === 'public'), async (req, res) => {
        try {
          if (fnc.value) {
            const data = await fnc.value.bind(self)(req);

            // if no data and params are present, return 404
            if (data === null && Object.keys(req.params).length > 0) {
              throw new ErrorNotFound();
            }

            if ('_raw' in req.query) {
              res.send(data);
            } else {
              if (typeof data === 'object' && 'items' in data && 'total' in data) {
                res.send({
                  status: 'success',
                  data:   data.items,
                  total:  data.total,
                });
              } else {
                res.send({
                  status: 'success',
                  data,
                });
              }
            }
          } else {
            res.status(500).send({
              status:  'error',
              message: 'No function to call',
            });
          }
        } catch (e) {
          if (e instanceof ErrorNotFound) {
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
      addScope(self.scope(params.isSensitive ? 'sensitive' : 'manage'));
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