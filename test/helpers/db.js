/* eslint-disable @typescript-eslint/no-var-requires */
const _ = require('lodash');
const chalk = require('chalk');
const variable = require('./variable');

const { debug } = require('../../dest/helpers/log');
const waitMs = require('./time').waitMs;

const startup = _.now();

const { getManager, getRepository } = require('typeorm');
const { Alias } = require('../../dest/entity/alias');
const { Cooldown } = require('../../dest/entity/cooldown');
const { Bets, BetsParticipations } = require('../../dest/entity/bets');
const { Commands, CommandsCount, CommandsResponses } = require('../../dest/entity/commands');
const { Keyword } = require('../../dest/entity/keyword');
const { Settings } = require('../../dest/entity/settings');
const { Quotes } = require('../../dest/entity/quotes');
const { User, UserTip, UserBit } = require('../../dest/entity/user');
const { ModerationPermit } = require('../../dest/entity/moderation')
const { Price } = require('../../dest/entity/price')

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
      await waitMs(400); // wait ittle bit for transactions to be done

      const entities = [BetsParticipations, UserTip, UserBit, CommandsResponses, User, ModerationPermit, Alias, Bets, Commands, CommandsCount, Quotes, Settings, Cooldown, Keyword, Price];
      if (['postgres', 'mysql'].includes((await getManager()).connection.options.type)) {
        const metadatas = [];
        for (const entity of entities) {
          metadatas.push((await getManager()).connection.getMetadata(entity));
        }

        await getManager().transaction(async transactionalEntityManager => {
          if (['mysql'].includes((await getManager()).connection.options.type)) {
            await transactionalEntityManager.query('SET FOREIGN_KEY_CHECKS=0;');
          }
          for (const metadata of metadatas) {
            if (['mysql'].includes((await getManager()).connection.options.type)) {
              await transactionalEntityManager.query(`TRUNCATE "${metadata.tableName}"`);
            } else {
              await transactionalEntityManager.query(`TRUNCATE "${metadata.tableName}" CASCADE`);
            }
          }
          if (['mysql'].includes((await getManager()).connection.options.type)) {
            await transactionalEntityManager.query('SET FOREIGN_KEY_CHECKS=1;');
          }
        });
      } else {
        for (const entity of entities) {
          await getRepository(entity).clear();
        }
      }

      debug('test', chalk.bgRed('*** Cleaned successfully ***'));


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


      global.oauth.broadcasterId = '54321';
      await variable.isEqual('global.oauth.broadcasterId', '54321');

      global.tmi.ignorelist = []

      resolve();
    };
    return new Promise((resolve, reject) => {
      waitForIt(resolve, reject);
    });
  },
};
