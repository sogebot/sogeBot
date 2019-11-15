/* eslint-disable @typescript-eslint/no-var-requires */
const _ = require('lodash');
const chalk = require('chalk');
const variable = require('./variable');

const { debug } = require('../../dest/helpers/log');
const waitMs = require('./time').waitMs;

const { getManager, getRepository } = require('typeorm');
const { Alias } = require('../../dest/database/entity/alias');
const { Cooldown } = require('../../dest/database/entity/cooldown');
const { Bets, BetsParticipations } = require('../../dest/database/entity/bets');
const { Commands, CommandsCount, CommandsResponses } = require('../../dest/database/entity/commands');
const { Keyword } = require('../../dest/database/entity/keyword');
const { Settings } = require('../../dest/database/entity/settings');
const { Quotes } = require('../../dest/database/entity/quotes');
const { User, UserTip, UserBit } = require('../../dest/database/entity/user');
const { ModerationPermit } = require('../../dest/database/entity/moderation');
const { Raffle } = require('../../dest/database/entity/raffle');
const { Price } = require('../../dest/database/entity/price');
const { Timer, TimerResponse } = require('../../dest/database/entity/timer');
const { Poll, PollVote } = require('../../dest/database/entity/poll');
const { Duel } = require('../../dest/database/entity/duel');
const { Variable, VariableHistory, VariableURL } = require('../../dest/database/entity/variable');
const { Event, EventOperation } = require('../../dest/database/entity/event');

module.exports = {
  cleanup: async function () {
    const waitForIt = async (resolve, reject) => {
      try {
        isDbConnected = (await getManager()).connection.isConnected;
      } catch (e) {}
      if (!isDbConnected || _.isNil(global.db) || _.isNil(global.systems)) {
        return setTimeout(() => waitForIt(resolve, reject), 5000);
      }

      debug('test', chalk.bgRed('*** Cleaning up collections ***'));
      await waitMs(400); // wait ittle bit for transactions to be done

      const entities = [Event, EventOperation, Variable, VariableHistory, VariableURL, Raffle, Duel, PollVote, Poll, TimerResponse, Timer, BetsParticipations, UserTip, UserBit, CommandsResponses, User, ModerationPermit, Alias, Bets, Commands, CommandsCount, Quotes, Settings, Cooldown, Keyword, Price];
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
              await transactionalEntityManager.query(`TRUNCATE TABLE ${metadata.tableName}`);
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
