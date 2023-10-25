import assert from 'assert';

import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized.js';

import { translate } from '../../../dest/translate.js';
import { db, message, user } from '../../general.js';


const emotesOffsetsKappa = new Map();
emotesOffsetsKappa.set('25', ['0-4']);

const emotesOffsetsHeyGuys = new Map();
emotesOffsetsHeyGuys.set('30259', ['0-6']);


describe('Emotes - combo - @func2', () => {
  let emotes = null;
  beforeEach(async () => {
    await db.cleanup();
    emotes = (await import('../../../dest/systems/emotescombo.js')).default
  });
  describe('Emotes combo should send proper message after 3 emotes', () => {
    let comboLastBreak = 0;
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
    });

    // we run it twice as to test without cooldown
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 3; i++) {
        it('Send a message with Kappa emote', async () => {
          await emotes.containsEmotes({
            emotesOffsets: emotesOffsetsKappa,
            sender:        user.owner,
            parameters:    'Kappa',
            message:       'Kappa',
          });
        });
      }

      it ('Send a message with HeyGuys emote', async () => {
        await emotes.containsEmotes({
          emotesOffsets: emotesOffsetsHeyGuys,
          sender:        user.owner,
          parameters:    'HeyGuys',
          message:       'HeyGuys',
        });
      });

      it ('We are expecting KAPPA combo break message', async () => {
        await message.isSentRaw('3x Kappa combo', user.owner);
      });

      it ('Combo last break should be updated', async () => {
        assert(comboLastBreak !== emotes.comboLastBreak);
        comboLastBreak = emotes.comboLastBreak;
      });
    }
  });

  describe('Emotes combo should send proper message after 3 and 3 emotes', () => {
    let comboLastBreak = 0;
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      emotes.comboEmoteCount = 0;
    });

    // we run it twice as to test without cooldown
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 3; i++) {
        it('Send a message with Kappa emote', async () => {
          await emotes.containsEmotes({
            emotesOffsets: emotesOffsetsKappa,
            sender:        user.owner,
            parameters:    'Kappa',
            message:       'Kappa',
          });
        });
      }
      for (let i = 0; i < 3; i++) {
        it('Send a message with HeyGuys emote', async () => {
          await emotes.containsEmotes({
            emotesOffsets: emotesOffsetsHeyGuys,
            sender:        user.owner,
            parameters:    'HeyGuys',
            message:       'HeyGuys',
          });
        });
      }

      it('Send a message with Kappa emote', async () => {
        await emotes.containsEmotes({
          emotesOffsets: emotesOffsetsKappa,
          sender:        user.owner,
          parameters:    'Kappa',
          message:       'Kappa',
        });
      });

      it ('We are expecting KAPPA combo break message', async () => {
        await message.isSentRaw('3x Kappa combo', user.owner);
      });

      it ('We are expecting HEYGUYS combo break message', async () => {
        await message.isSentRaw('3x HeyGuys combo', user.owner);
      });

      it ('Combo last break should be updated', async () => {
        assert(comboLastBreak !== emotes.comboLastBreak);
        comboLastBreak = emotes.comboLastBreak;
      });
    }
  });

  describe('Emotes combo should send proper message after 3 emotes with cooldown', () => {
    let comboLastBreak = 0;
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      emotes.comboLastBreak = 0;
      emotes.comboCooldown = 60;
      emotes.comboEmoteCount = 0;
    });
    after(() => {
      emotes.comboCooldown = 0;
    });

    // we run it twice as to test without cooldown
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 3; i++) {
        it('Send a message with Kappa emote', async () => {
          console.log(emotes.comboEmote)
          console.log(emotes.comboEmoteCount)
          await emotes.containsEmotes({
            emotesOffsets: emotesOffsetsKappa,
            sender:        user.owner,
            parameters:    'Kappa',
            message:       'Kappa',
          });
        });
      }

      it ('Send a message with HeyGuys emote', async () => {
        await emotes.containsEmotes({
          emotesOffsets: emotesOffsetsHeyGuys,
          sender:        user.owner,
          parameters:    'HeyGuys',
          message:       'HeyGuys',
        });
      });

      it ('We are expecting KAPPA combo break message', async () => {
        await message.isSentRaw('3x Kappa combo', user.owner);
      });

      if (j === 0) {
        it ('Combo last break should be updated', async () => {
          assert(comboLastBreak !== emotes.comboLastBreak);
          comboLastBreak = emotes.comboLastBreak;
        });
      } else {
        it ('Combo last break should not be updated', async () => {
          assert(comboLastBreak === emotes.comboLastBreak);
        });
      }
    }
  });
});
