import chalk from 'chalk';

// eslint-disable-next-line import/order
import { debug } from '../../dest/helpers/log.js';
// eslint-disable-next-line import/order
import { waitMs } from './time.js';

import { Alias, AliasGroup } from '../../dest/database/entity/alias.js';
import { Commands, CommandsCount, CommandsGroup } from '../../dest/database/entity/commands.js';
import { Cooldown } from '../../dest/database/entity/cooldown.js';
import { DiscordLink } from '../../dest/database/entity/discord.js';
import { Duel } from '../../dest/database/entity/duel.js';
import { Event, EventOperation } from '../../dest/database/entity/event.js';
import { EventList } from '../../dest/database/entity/eventList.js';
import { HeistUser } from '../../dest/database/entity/heist.js';
import { Keyword, KeywordGroup } from '../../dest/database/entity/keyword.js';
import { ModerationPermit } from '../../dest/database/entity/moderation.js';
import { PermissionCommands } from '../../dest/database/entity/permissions.js';
import { PointsChangelog } from '../../dest/database/entity/points.js';
import { Price } from '../../dest/database/entity/price.js';
import { Quotes } from '../../dest/database/entity/quotes.js';
import { Raffle, RaffleParticipant } from '../../dest/database/entity/raffle.js';
import { Rank } from '../../dest/database/entity/rank.js';
import { Settings } from '../../dest/database/entity/settings.js';
import { SongRequest } from '../../dest/database/entity/song.js';
import { Timer, TimerResponse } from '../../dest/database/entity/timer.js';
import { User, UserTip, UserBit } from '../../dest/database/entity/user.js';
import { Variable } from '../../dest/database/entity/variable.js';
import { getIsDbConnected, getIsBotStarted } from '../../dest/helpers/database.js';
import emitter from '../../dest/helpers/interfaceEmitter.js';
import translation from '../../dest/translate.js';
import { AppDataSource } from '../../dest/database.js';

export const cleanup = async () => {
  const waitForIt = async (resolve, reject) => {
    if (!getIsBotStarted() || !translation.isLoaded || !getIsDbConnected()) {
      debug('test', `Bot is not yet started, waiting 100ms, bot: ${getIsBotStarted()} | db: ${getIsDbConnected()} | translation: ${translation.isLoaded}`);
      return setTimeout(() => waitForIt(resolve, reject), 100);
    } else {
      debug('test', `Bot is started`);
    }

    const permissions = (await import('../../dest/permissions.js')).default;
    const changelog = (await import('../../dest/helpers/user/changelog.js'));

    debug('test', chalk.bgRed('*** Cleaning up collections ***'));
    await changelog.flush();
    await waitMs(1000); // wait little bit for transactions to be done

    const entities = [Settings, AliasGroup, CommandsGroup, KeywordGroup, HeistUser, EventList, PointsChangelog, SongRequest, RaffleParticipant, Rank, PermissionCommands, Event, EventOperation, Variable, Raffle, Duel, TimerResponse, Timer, UserTip, UserBit, User, ModerationPermit, Alias, Commands, CommandsCount, Quotes, Cooldown, Keyword, Price, DiscordLink];
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
}
