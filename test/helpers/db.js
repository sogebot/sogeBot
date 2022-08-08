/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');

// eslint-disable-next-line import/order
const { debug } = require('../../dest/helpers/log');
// eslint-disable-next-line import/order
const waitMs = require('./time').waitMs;

const { getManager, getRepository } = require('typeorm');

const { Alias, AliasGroup } = require('../../dest/database/entity/alias');
const { Bets, BetsParticipations } = require('../../dest/database/entity/bets');
const { Commands, CommandsCount, CommandsResponses, CommandsGroup } = require('../../dest/database/entity/commands');
const { Cooldown } = require('../../dest/database/entity/cooldown');
const { DiscordLink } = require('../../dest/database/entity/discord');
const { Duel } = require('../../dest/database/entity/duel');
const { Event, EventOperation } = require('../../dest/database/entity/event');
const { EventList } = require('../../dest/database/entity/eventList');
const { HeistUser } = require('../../dest/database/entity/heist');
const { Keyword, KeywordGroup } = require('../../dest/database/entity/keyword');
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
const emitter = require('../../dest/helpers/interfaceEmitter').default;
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

      const permissions = (require('../../dest/permissions')).default;
      const changelog = (require('../../dest/helpers/user/changelog'));

      debug('test', chalk.bgRed('*** Cleaning up collections ***'));
      await waitMs(1000); // wait little bit for transactions to be done
      await changelog.flush();
      await waitMs(1000); // wait little bit for transactions to be done

      const entities = [AliasGroup, CommandsGroup, KeywordGroup, HeistUser, EventList, PointsChangelog, SongRequest, RaffleParticipant, Rank, PermissionCommands, Event, EventOperation, Variable, VariableHistory, VariableURL, Raffle, Duel, PollVote, Poll, TimerResponse, Timer, BetsParticipations, UserTip, UserBit, CommandsResponses, User, ModerationPermit, Alias, Bets, Commands, CommandsCount, Quotes, Cooldown, Keyword, Price, DiscordLink];
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

      invalidateParserCache();

      // set owner as broadcaster
      emitter.emit('set', '/services/twitch', 'broadcasterUsername', '__broadcaster__');
      emitter.emit('set', '/services/twitch', 'botUsername', '__bot__');
      emitter.emit('set', '/services/twitch', 'botId', '12345');
      emitter.emit('set', '/services/twitch', 'broadcasterId', '54321');
      emitter.emit('set', '/services/twitch', 'generalOwners', ['__broadcaster__', '__owner__']);
      emitter.emit('set', '/services/twitch', 'ignorelist', []);
      emitter.emit('set', '/services/twitch', 'sendAsReply', true);

      resolve();
    };
    return new Promise((resolve, reject) => {
      debug('test', chalk.bgRed('cleanup init'));
      waitForIt(resolve, reject);
    });
  },
};
