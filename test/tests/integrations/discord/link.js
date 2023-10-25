import assert from 'assert';

import { MINUTE } from '@sogebot/ui-helpers/constants.js';
import { v4 } from 'uuid'

import { db, message, user } from '../../../general.js';

import { DiscordLink } from '../../../../dest/database/entity/discord.js';
import { AppDataSource } from '../../../../dest/database.js';
import discord from '../../../../dest/integrations/discord.js'

describe('integrations/discord - !link - @func2', () => {
  describe('removeExpiredLinks removes 10 minutes old links', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();

      // enable integration
      discord.status({ state: true });

      for (let i=0; i<100; i++) {
        await AppDataSource.getRepository(DiscordLink).save({
          tag:       'test@0123',
          discordId: 'n/a',
          createdAt: Date.now() - (MINUTE / 2) * i,
          userId:    null,
        });
      }
    });

    after(() => {
      discord.status({ state: false });
    });

    it('Purge all old links', async () => {
      await discord.removeExpiredLinks();
    });

    it('We should have only 20 links', async () => {
      const count = await AppDataSource.getRepository(DiscordLink).count();
      assert(count === 20, `Expected 20 links, got ${count}`);
    });
  });

  describe('!link on discord should properly create DiscordLink and !unlink should delete', async () => {
    let link;
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();

      // enable integration
      discord.status({ state: true });
    });

    after(() => {
      discord.status({ state: false });
    });

    it('Generate new link through discord', async () => {
      await discord.message('!link', {
        name: 'test',
      },
      {
        id:   '12345',
        tag:  'test#1234',
        send: () => {
          return;
        },
      },
      {
        reply: () => {
          return;
        },
        delete: () => {
          return;
        },
      });
    });

    it('Purge all old links', async () => {
      await discord.removeExpiredLinks();
    });

    it('We should have one link in DiscordLink', async () => {
      const data = await AppDataSource.getRepository(DiscordLink).findAndCount();
      assert(data[1] === 1, `Expected 1 link, got ${data[1]}`);
      link = data[0][0];
    });

    it('User should be able to !link on Twitch', async () => {
      const r = await discord.linkAccounts({
        parameters: link.id,
        sender:     user.viewer,
      });
      assert.strictEqual(r[0].response, `@__viewer__, this account was linked with test#1234.`);
    });

    it('Accounts should be linked in DiscordLink', async () => {
      const discord_link = (await AppDataSource.getRepository(DiscordLink).find())[0];
      assert(discord_link.userId === user.viewer.userId, `Link is not properly linked.\n${JSON.stringify(link, null, 2)}`);
    });

    it('User2 should not be able to use same !link on Twitch', async () => {
      const r = await discord.linkAccounts({
        parameters: link.id,
        sender:     user.viewer2,
      });
      assert.strictEqual(r[0].response, `@__viewer2__, invalid or expired token.`);
    });

    it('Accounts should be linked in DiscordLink to first user', async () => {
      const discord_link = (await AppDataSource.getRepository(DiscordLink).find())[0];
      assert(discord_link.userId === user.viewer.userId, `Link is not properly linked.\n${JSON.stringify(link, null, 2)}`);
    });

    it('User should be able to !unlink on Twitch', async () => {
      const r = await discord.unlinkAccounts({
        sender: user.viewer,
      });
      assert.strictEqual(r[0].response, `@__viewer__, all your links were deleted`);
    });

    it('We should have zero link in DiscordLink', async () => {
      const count = await AppDataSource.getRepository(DiscordLink).count();
      assert(count === 0, `Expected 0 links, got ${count}`);
    });
  });
});
