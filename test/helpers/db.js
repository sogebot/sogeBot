/* eslint-disable @typescript-eslint/no-var-requires */
const _ = require('lodash');
const chalk = require('chalk');
const variable = require('./variable');

const { debug } = require('../../dest/helpers/log');

const startup = _.now();

const { getManager } = require('typeorm');
const { Alias } = require('../../dest/entity/alias');
const { Bets } = require('../../dest/entity/bets')
const { Commands, CommandsResponses, CommandsCount } = require('../../dest/entity/commands');
const { Settings } = require('../../dest/entity/settings');
const { Quotes } = require('../../dest/entity/quotes');

let isDbConnected = false;

module.exports = {
  cleanup: async function () {
    const waitForIt = async (resolve, reject) => {
      try {
        isDbConnected = (await getManager()).connection.isConnected;
      } catch (e) {}
      if (!isDbConnected || _.isNil(global.db) || !global.db.engine.connected || _.isNil(global.systems) || _.now() - startup < 10000) {
        return setTimeout(() => waitForIt(resolve, reject), 10);
      }

      debug('test', chalk.bgRed('*** Cleaning up collections ***'));

      const entities = [Alias, Bets, Commands, CommandsResponses, CommandsCount, Quotes, Settings];
      for (const entity of entities) {
        for (const item of (await getManager().createQueryBuilder().select('entity').from(entity, 'entity').getMany())) {
          await getManager().createQueryBuilder().delete().from(entity).where('id = :id', { id: item.id }).execute();
        }
      }

      const collections = await global.db.engine.collections();
      for (const c of collections) {
        await global.db.engine.remove(c, {});
      }
      await global.permissions.ensurePreservedPermissionsInDb(); // re-do core permissions

      global.oauth.generalChannel = 'soge__';
      await variable.isEqual('global.oauth.generalChannel', 'soge__');

      global.oauth.generalOwners = ['soge__', '__owner__'];
      await variable.isEqual('global.oauth.generalOwners', ['soge__', '__owner__']);

      global.oauth.broadcasterUsername = 'broadcaster';
      await variable.isEqual('global.oauth.broadcasterUsername', 'broadcaster');

      global.oauth.botUsername = 'bot';
      await variable.isEqual('global.oauth.botUsername', 'bot');

      global.oauth.botId = '12345';
      await variable.isEqual('global.oauth.botId', '12345');

      global.oauth.broadcasterUsername = 'broadcaster';
      await variable.isEqual('global.oauth.broadcasterUsername', 'broadcaster');

      resolve();
    };
    return new Promise((resolve, reject) => {
      waitForIt(resolve, reject);
    });
  },
};
