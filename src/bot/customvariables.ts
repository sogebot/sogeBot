import { setTimeout } from 'timers';

import { isNil } from 'lodash';
import { getRepository, IsNull } from 'typeorm';

import Core from './_interface';
import { Variable, VariableHistory, VariableInterface, VariableURL, VariableWatch } from './database/entity/variable';
import { announce, getBot, prepare } from './helpers/commons';
import { getValueOf, runScript, setValueOf, updateWidgetAndTitle } from './helpers/customvariables';
import { isDbConnected } from './helpers/database';
import { adminEndpoint } from './helpers/socket';

class CustomVariables extends Core {
  timeouts: {
    [x: string]: NodeJS.Timeout;
  } = {};

  constructor () {
    super();
    this.addMenu({ category: 'registry', name: 'custom-variables', id: 'registry.customVariables/list', this: null });
    this.checkIfCacheOrRefresh();
  }

  async getURL(req: any, res: any) {
    try {
      const variable = (await getRepository(Variable).find({
        relations: ['urls'],
      }))
        .find(v => {
          return v.urls.find(url => url.id === req.params.id);
        });
      if (variable) {
        if (variable.urls.find(url => url.id === req.params.id)?.GET) {
          return res.status(200).send({ value: await getValueOf(variable.variableName) });
        } else {
          return res.status(403).send({ error: 'This endpoint is not enabled for GET', code: 403 });
        }
      } else {
        return res.status(404).send({ error: 'Variable not found', code: 404 });
      }
    } catch (e) {
      res.status(500).send({ error: 'Internal Server Error', code: 500 });
      throw e;
    }
  }

  async postURL(req: any, res: any) {
    try {
      const variable = (await getRepository(Variable).find({
        relations: ['urls'],
      }))
        .find(v => {
          return v.urls.find(url => url.id === req.params.id);
        });
      if (variable) {
        if (variable.urls.find(url => url.id === req.params.id)?.POST) {
          const value = await setValueOf(variable, req.body.value, { sender: null, readOnlyBypass: true });
          if (value.isOk) {
            if (variable.urls.find(url => url.id === req.params.id)?.showResponse) {
              if (value.updated.responseType === 0) {
                announce(prepare('filters.setVariable', { value: value.updated.currentValue, variable: variable }), 'general');
              } else if (value.updated.responseType === 1) {
                if (value.updated.responseText) {
                  announce(value.updated.responseText.replace('$value', value.updated.currentValue), 'general');
                }
              }
            }
            return res.status(200).send({ oldValue: variable.currentValue, value: value.setValue });
          } else {
            return res.status(400).send({ error: 'This value is not applicable for this endpoint', code: 400 });
          }
        } else {
          return res.status(403).send({ error: 'This endpoint is not enabled for POST', code: 403 });
        }
      } else {
        return res.status(404).send({ error: 'Variable not found', code: 404 });
      }
    } catch (e) {
      res.status(500).send({ error: 'Internal Server Error', code: 500 });
      throw e;
    }
  }

  sockets () {
    adminEndpoint(this.nsp, 'customvariables::list', async (cb) => {
      const variables = await getRepository(Variable).find();
      cb(null, variables);
    });
    adminEndpoint(this.nsp, 'customvariables::runScript', async (id, cb) => {
      try {
        const item = await getRepository(Variable).findOne({ id: String(id) });
        if (!item) {
          throw new Error('Variable not found');
        }
        const newCurrentValue = await runScript(item.evalValue, { sender: null, _current: item.currentValue, isUI: true });
        const runAt = Date.now();
        cb(null, await getRepository(Variable).save({
          ...item, currentValue: newCurrentValue, runAt,
        }));
      } catch (e) {
        cb(e.stack, null);
      }
    });
    adminEndpoint(this.nsp, 'customvariables::testScript', async (opts, cb) => {
      let returnedValue;
      try {
        returnedValue = await runScript(opts.evalValue, { isUI: true, _current: opts.currentValue, sender: { username: 'testuser', userId: 0, source: 'twitch' }});
      } catch (e) {
        cb(e.stack, null);
      }
      cb(null, returnedValue);
    });
    adminEndpoint(this.nsp, 'customvariables::isUnique', async ({ variable, id }, cb) => {
      cb(null, (await getRepository(Variable).find({ variableName: String(variable) })).filter(o => o.id !== id).length === 0);
    });
    adminEndpoint(this.nsp, 'customvariables::delete', async (id, cb) => {
      const item = await getRepository(Variable).findOne({ id: String(id) });
      if (item) {
        await getRepository(Variable).remove(item);
        await getRepository(VariableWatch).delete({ variableId: String(id) });
        updateWidgetAndTitle();
      }
      if (cb) {
        cb(null);
      }
    });
    adminEndpoint(this.nsp, 'generic::getOne', async (id, cb) => {
      cb(null, await getRepository(Variable).findOne({
        relations: ['history', 'urls'],
        where: { id },
      }));
    });
    adminEndpoint(this.nsp, 'customvariables::save', async (item, cb) => {
      try {
        await getRepository(Variable).save(item);
        // somehow this is not populated by save on sqlite
        if (item.urls) {
          for (const url of item.urls) {
            await getRepository(VariableURL).save({
              ...url,
              variable: item,
            });
          }
        }
        // somehow this is not populated by save on sqlite
        if (item.history) {
          for (const history of item.history) {
            await getRepository(VariableHistory).save({
              ...history,
              variable: item,
            });
          }
        }
        await getRepository(VariableHistory).delete({ variableId: IsNull() });
        await getRepository(VariableURL).delete({ variableId: IsNull() });

        updateWidgetAndTitle(item.variableName);
        cb(null, item.id);
      } catch (e) {
        cb(e.stack, item.id);
      }
    });
  }

  async checkIfCacheOrRefresh () {
    if (!isDbConnected) {
      setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
      return;
    }

    clearTimeout(this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`]);
    const items = await getRepository(Variable).find({ type: 'eval' });

    for (const item of items as Required<VariableInterface>[]) {
      try {
        item.runAt = isNil(item.runAt) ? 0 : item.runAt;
        const shouldRun = item.runEvery > 0 && Date.now() - new Date(item.runAt).getTime() >= item.runEvery;
        if (shouldRun) {
          const newValue = await runScript(item.evalValue, { _current: item.currentValue, sender: getBot(), isUI: false });
          item.runAt = Date.now();
          item.currentValue = newValue;
          await getRepository(Variable).save(item);
          await updateWidgetAndTitle(item.variableName);
        }
      } catch (e) {} // silence errors
    }
    this.timeouts[`${this.constructor.name}.checkIfCacheOrRefresh`] = setTimeout(() => this.checkIfCacheOrRefresh(), 1000);
  }
}

export default new CustomVariables();
