/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');

// eslint-disable-next-line import/order
const { debug } = require('../../dest/helpers/log');
// eslint-disable-next-line import/order
const waitMs = require('./time').waitMs;

const { getManager, getRepository } = require('typeorm');

const { Alias } = require('../../dest/database/entity/alias');
const { Bets, BetsParticipations } = require('../../dest/database/entity/bets');
const { Commands, CommandsCount, CommandsResponses } = require('../../dest/database/entity/commands');
const { Cooldown, CooldownViewer } = require('../../dest/database/entity/cooldown');
const { Duel } = require('../../dest/database/entity/duel');
const { Event, EventOperation } = require('../../dest/database/entity/event');
const { EventList } = require('../../dest/database/entity/eventList');
const { HeistUser } = require('../../dest/database/entity/heist');
const { Keyword } = require('../../dest/database/entity/keyword');
const { ModerationPermit } = require('../../dest/database/entity/moderation');
const { PermissionCommands } = require('../../dest/database/entity/permissions');
const { PointsChangelog } = require('../../dest/database/entity/points');
const { Poll, PollVote } = require('../../dest/database/entity/poll');
const { Price } = require('../../dest/database/entity/price');
const { Quotes } = require('../../dest/database/entity/quotes');
const { Raffle, RaffleParticipant } = require('../../dest/database/entity/raffle');
const { Rank } = require('../../dest/database/entity/rank');
const { SongRequest } = require('../../dest/database/entity/song');
const { Timer, TimerResponse } = require('../../dest/database/entity/timer');
const { User, UserTip, UserBit } = require('../../dest/database/entity/user');
const { Variable, VariableHistory, VariableURL } = require('../../dest/database/entity/variable');
const { invalidateParserCache } = require('../../dest/helpers/cache');
const { getIsDbConnected, getIsBotStarted } = require('../../dest/helpers/database');
const translation = (require('../../dest/translate')).default;

let initialCleanup = true;

module.exports = {
  cleanup: async function () {
    const waitForIt = async (resolve, reject) => {
      if (!getIsBotStarted() || !translation.isLoaded || !getIsDbConnected()) {
        debug('test', `Bot is not yet started, waiting 1s, bot: ${getIsBotStarted()} | db: ${getIsDbConnected()} | translation: ${translation.isLoaded}`);
        return setTimeout(() => waitForIt(resolve, reject), 1000);
      } else {
        debug('test', `Bot is started`);
        if (initialCleanup) {
          await waitMs(30000);
          console.log('=============== Initial 30s wait until tests are started. =============== ');
          initialCleanup = false;
        }
      }

      const oauth = (require('../../dest/oauth')).default;
      const tmi = (require('../../dest/tmi')).default;
      const permissions = (require('../../dest/permissions')).default;
      const changelog = (require('../../dest/helpers/user/changelog'));

      debug('test', chalk.bgRed('*** Cleaning up collections ***'));
      await waitMs(400); // wait little bit for transactions to be done
      await changelog.flush();

      const entities = [HeistUser, EventList, PointsChangelog, SongRequest, RaffleParticipant, Rank, PermissionCommands, Event, EventOperation, Variable, VariableHistory, VariableURL, Raffle, Duel, PollVote, Poll, TimerResponse, Timer, BetsParticipations, UserTip, UserBit, CommandsResponses, User, ModerationPermit, Alias, Bets, Commands, CommandsCount, Quotes, Cooldown, CooldownViewer, Keyword, Price];
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

      oauth.generalChannel = '__broadcaster__';
      oauth.generalOwners = ['__broadcaster__', '__owner__'];
      oauth.broadcasterUsername = 'broadcaster';
      oauth.botUsername = 'bot';
      oauth.botId = '12345';

      oauth.broadcasterId = '54321';
      tmi.ignorelist = [];

      invalidateParserCache();
      resolve();
    };
    return new Promise((resolve, reject) => {
      debug('test', chalk.bgRed('cleanup init'));
      waitForIt(resolve, reject);
    });
  },
};
