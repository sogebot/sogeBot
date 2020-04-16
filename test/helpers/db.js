/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');

const { debug } = require('../../dest/helpers/log');
const waitMs = require('./time').waitMs;
const { getIsDbConnected, getIsBotStarted } = require('../../dest/helpers/database');

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
const { Raffle, RaffleParticipant } = require('../../dest/database/entity/raffle');
const { Price } = require('../../dest/database/entity/price');
const { Rank } = require('../../dest/database/entity/rank');
const { Timer, TimerResponse } = require('../../dest/database/entity/timer');
const { Poll, PollVote } = require('../../dest/database/entity/poll');
const { Duel } = require('../../dest/database/entity/duel');
const { Variable, VariableHistory, VariableURL } = require('../../dest/database/entity/variable');
const { Event, EventOperation } = require('../../dest/database/entity/event');
const { PermissionCommands } = require('../../dest/database/entity/permissions');
const { SongRequest } = require('../../dest/database/entity/song');

const oauth = (require('../../dest/oauth')).default;
const tmi = (require('../../dest/tmi')).default;
const permissions = (require('../../dest/permissions')).default;
const translation = (require('../../dest/translate')).default;

module.exports = {
  cleanup: async function () {
    const waitForIt = async (resolve, reject) => {
      if (!getIsBotStarted() || !translation.isLoaded || !getIsDbConnected()) {
        debug('test', `Bot is not yet started, waiting 1s, bot: ${getIsBotStarted()} | db: ${getIsDbConnected()} | translation: ${translation.isLoaded}`);
        return setTimeout(() => waitForIt(resolve, reject), 1000);
      } else {
        debug('test', `Bot is started`);
      }

      debug('test', chalk.bgRed('*** Cleaning up collections ***'));
      await waitMs(400); // wait little bit for transactions to be done

      const entities = [SongRequest, RaffleParticipant, Rank, PermissionCommands, Event, EventOperation, Variable, VariableHistory, VariableURL, Raffle, Duel, PollVote, Poll, TimerResponse, Timer, BetsParticipations, UserTip, UserBit, CommandsResponses, User, ModerationPermit, Alias, Bets, Commands, CommandsCount, Quotes, Settings, Cooldown, Keyword, Price];
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

      await permissions.ensurePreservedPermissionsInDb(); // re-do core permissions

      oauth.generalChannel = 'soge__';
      oauth.generalOwners = ['soge__', '__owner__'];
      oauth.broadcasterUsername = 'broadcaster';
      oauth.botUsername = 'bot';
      oauth.botId = '12345';

      oauth.broadcasterId = '54321';
      tmi.ignorelist = [];

      resolve();
    };
    return new Promise((resolve, reject) => {
      debug('test', chalk.bgRed('cleanup init'));
      waitForIt(resolve, reject);
    });
  },
};
