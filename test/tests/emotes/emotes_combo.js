/* global */
const assert = require('assert');

const { getLocalizedName } = require('@sogebot/ui-helpers/getLocalized');

const { translate } = require('../../../dest/translate');
require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

let emotes;

describe('Emotes - combo - @func2', () => {
  describe('Emotes combo should send proper message after 3 emotes', () => {
    let comboLastBreak = 0;
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      emotes = (require('../../../dest/systems/emotescombo')).default;
      emotes.enableEmotesCombo = true;
    });
    after(() => {
      emotes.enableEmotesCombo = false;
    });

    // we run it twice as to test without cooldown
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 3; i++) {
        it('Send a message with Kappa emote', async () => {
          await emotes.containsEmotes({
            sender: {
              ...user.owner, emotes: [
                {
                  id:    '25',
                  start: 0,
                  end:   4,
                },
              ],
            }, parameters: 'Kappa', message: 'Kappa',
          });
        });
      }

      it ('Send a message with HeyGuys emote', async () => {
        await emotes.containsEmotes({
          sender: {
            ...user.owner, emotes: [
              {
                id:    '30259',
                start: 0,
                end:   6,
              },
            ],
          }, parameters: 'HeyGuys', message: 'HeyGuys',
        });
      });

      it ('We are expecting combo break message', async () => {
        await message.isSentRaw('3x Kappa combo', user.owner);
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
      emotes = (require('../../../dest/systems/emotescombo')).default;
      emotes.comboLastBreak = 0;
      emotes.enableEmotesCombo = true;
      emotes.comboCooldown = 60;
    });
    after(() => {
      emotes.enableEmotesCombo = false;
      emotes.comboCooldown = 0;
    });

    // we run it twice as to test without cooldown
    for (let j = 0; j < 2; j++) {
      for (let i = 0; i < 3; i++) {
        it('Send a message with Kappa emote', async () => {
          await emotes.containsEmotes({
            sender: {
              ...user.owner, emotes: [
                {
                  id:    '25',
                  start: 0,
                  end:   4,
                },
              ],
            }, parameters: 'Kappa', message: 'Kappa',
          });
        });
      }

      it ('Send a message with HeyGuys emote', async () => {
        await emotes.containsEmotes({
          sender: {
            ...user.owner, emotes: [
              {
                id:    '30259',
                start: 0,
                end:   6,
              },
            ],
          }, parameters: 'HeyGuys', message: 'HeyGuys',
        });
      });

      it ('We are expecting combo break message', async () => {
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
