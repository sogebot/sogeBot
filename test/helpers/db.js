/* eslint-disable @typescript-eslint/no-var-requires */
const chalk = require('chalk');

// eslint-disable-next-line import/order
const { debug } = require('../../dest/helpers/log');
// eslint-disable-next-line import/order
const waitMs = require('./time').waitMs;

const { Alias, AliasGroup } = require('../../dest/database/entity/alias');
const { Bets } = require('../../dest/database/entity/bets');
const { Commands, CommandsCount, CommandsGroup } = require('../../dest/database/entity/commands');
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
const { Poll } = require('../../dest/database/entity/poll');
const { Price } = require('../../dest/database/entity/price');
const { Quotes } = require('../../dest/database/entity/quotes');
const { Raffle, RaffleParticipant } = require('../../dest/database/entity/raffle');
const { Rank } = require('../../dest/database/entity/rank');
const { Settings } = require('../../dest/database/entity/settings');
const { SongRequest } = require('../../dest/database/entity/song');
const { Timer, TimerResponse } = require('../../dest/database/entity/timer');
const { User, UserTip, UserBit } = require('../../dest/database/entity/user');
const { Variable } = require('../../dest/database/entity/variable');
const { getIsDbConnected, getIsBotStarted } = require('../../dest/helpers/database');
const emitter = require('../../dest/helpers/interfaceEmitter').default;
const translation = (require('../../dest/translate')).default;
const { AppDataSource } = require('../../dest/database');

module.exports = {
  cleanup: async function () {
    const waitForIt = async (resolve, reject) => {
      if (!getIsBotStarted() || !translation.isLoaded || !getIsDbConnected()) {
        debug('test', `Bot is not yet started, waiting 100ms, bot: ${getIsBotStarted()} | db: ${getIsDbConnected()} | translation: ${translation.isLoaded}`);
        return setTimeout(() => waitForIt(resolve, reject), 100);
      } else {
        debug('test', `Bot is started`);
      }

      const permissions = (require('../../dest/permissions')).default;
      const changelog = (require('../../dest/helpers/user/changelog'));

      debug('test', chalk.bgRed('*** Cleaning up collections ***'));
      await changelog.flush();
      await waitMs(1000); // wait little bit for transactions to be done

      const entities = [Settings, AliasGroup, CommandsGroup, KeywordGroup, HeistUser, EventList, PointsChangelog, SongRequest, RaffleParticipant, Rank, PermissionCommands, Event, EventOperation, Variable, Raffle, Duel, Poll, TimerResponse, Timer, UserTip, UserBit, User, ModerationPermit, Alias, Bets, Commands, CommandsCount, Quotes, Cooldown, Keyword, Price, DiscordLink];
      if (['postgres', 'mysql'].includes(AppDataSource.options.type)) {
        const metadatas = [];
        for (const entity of entities) {
          metadatas.push(AppDataSource.getMetadata(entity));
        }

        await AppDataSource.transaction(async transactionalEntityManager => {
          if (['mysql'].includes(AppDataSource.options.type)) {
            await transactionalEntityManager.query('SET FOREIGN_KEY_CHECKS=0;');
          }
          for (const metadata of metadatas) {
            debug('test', chalk.bgRed(`*** Cleaning up ${metadata.tableName} ***`));

            if (['mysql'].includes(AppDataSource.options.type)) {
              await transactionalEntityManager.query(`DELETE FROM \`${metadata.tableName}\` WHERE 1=1`);
            } else {
              await transactionalEntityManager.query(`DELETE FROM "${metadata.tableName}" WHERE 1=1`);
            }
          }
          if (['mysql'].includes(AppDataSource.options.type)) {
            await transactionalEntityManager.query('SET FOREIGN_KEY_CHECKS=1;');
          }
        });
      } else {
        for (const entity of entities) {
          await AppDataSource.getRepository(entity).clear();
        }
      }

      debug('test', chalk.bgRed('*** Cleaned successfully ***'));

      await permissions.ensurePreservedPermissionsInDb(); // re-do core permissions

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
