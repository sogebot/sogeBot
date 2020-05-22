/* global describe it before */


require('../../general.js');

const db = require('../../general.js').db;
const variable = require('../../general.js').variable;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const assert = require('assert');

const moderation = (require('../../../dest/systems/moderation')).default;

const tests = {
  'clips': [
    'clips.twitch.tv/TolerantExquisiteDuckOneHand',
    'www.twitch.tv/7ssk7/clip/StormyBraveAniseM4xHeh?filter=clips&range=30d&sort=time', // https://discordapp.com/channels/317348946144002050/619437014001123338/713323104574898186
  ],
  'links': [ // tests will test links, http://links, https://links
    'google.me',
    'google.shop',
    'google.com',
    'google.COM',
    'GOOGLE.com',
    'GOOGLE.COM',
    'google .com',
    'google .COM',
    'GOOGLE .com',
    'GOOGLE .COM',
    'google . com',
    'google . COM',
    'GOOGLE . com',
    'GOOGLE . COM',
    'google . com',
    'www.google.com',
    'www.google.COM',
    'www.GOOGLE.com',
    'www.GOOGLE.COM',
    'WWW.GOOGLE.COM',
    'www.google .com',
    'www.google .COM',
    'www.GOOGLE .com',
    'www.GOOGLE .COM',
    'WWW.GOOGLE .COM',
    'www.google . com',
    'www.google . COM',
    'www.GOOGLE . com',
    'www.GOOGLE . COM',
    'WWW.GOOGLE . COM',
    'www. google.com',
    'www. google.COM',
    'www. GOOGLE.com',
    'www. GOOGLE.COM',
    'WWW. GOOGLE.COM',
    'youtu.be/123jAJD123',
  ],
  'texts': [
    '#42 - proc hrajes tohle auto je dost na nic ....',
    '#44 - 1.2.3.4',
    '#47 - vypadá že máš problémy nad touto počítačovou hrou....doporučuji tvrdý alkohol',
  ],
};

describe('systems/moderation - containsLink()', () => {
  describe('moderationLinksClips=true & moderationLinksWithSpaces=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();

      moderation.cLinksIncludeSpaces = true;
      moderation.cLinksIncludeClips = true;
    });

    for (const [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        const protocols = ['', 'http://', 'https://'];
        for (const protocol of protocols) {
          for (const test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert(!(await moderation.containsLink({ sender: user.viewer, message: protocol + test })));
            });
          }
        }
      }

      if (type === 'clips') {
        const protocols = ['', 'http://', 'https://'];
        for (const protocol of protocols) {
          for (const test of listOfTests) {
            it(`clip '${protocol}${test}' should timeout`, async () => {
              assert(!(await moderation.containsLink({ sender: user.viewer, message: protocol + test })));
            });
          }
        }
      }

      if (type === 'texts') {
        for (const test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert(await moderation.containsLink({ sender: user.viewer, message: test }));
          });
        }
      }
    }
  });
  describe('moderationLinksClips=false & moderationLinksWithSpaces=true', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();

      moderation.cLinksIncludeSpaces = true;
      moderation.cLinksIncludeClips = false;
    });

    for (const [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        const protocols = ['', 'http://', 'https://'];
        for (const protocol of protocols) {
          for (const test of listOfTests) {
            it(`link '${protocol}${test}' should timeout`, async () => {
              assert(!(await moderation.containsLink({ sender: user.viewer, message: protocol + test })));
            });
          }
        }
      }

      if (type === 'clips') {
        const protocols = ['', 'http://', 'https://'];
        for (const protocol of protocols) {
          for (const test of listOfTests) {
            it(`clip '${protocol}${test}' should not timeout`, async () => {
              assert(await moderation.containsLink({ sender: user.viewer, message: protocol + test }));
            });
          }
        }
      }

      if (type === 'texts') {
        for (const test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert(await moderation.containsLink({ sender: user.viewer, message: test }));
          });
        }
      }
    }
  });
  describe('moderationLinksClips=true & moderationLinksWithSpaces=false', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();

      moderation.cLinksIncludeSpaces = false;
      moderation.cLinksIncludeClips = true;
    });

    for (const [type, listOfTests] of Object.entries(tests)) {
      if (type === 'links') {
        const protocols = ['', 'http://', 'https://'];
        for (const protocol of protocols) {
          for (const test of listOfTests) {
            if (test.indexOf(' ') > -1 && test.toLowerCase().indexOf('www. ') === -1) { // even if moderationLinksWithSpaces is false - www. google.com should be timeouted
              it(`link '${protocol}${test}' should not timeout`, async () => {
                assert(await moderation.containsLink({ sender: user.viewer, message: protocol + test }));
              });
            } else {
              it(`link '${protocol}${test}' should timeout`, async () => {
                assert(!(await moderation.containsLink({ sender: user.viewer, message: protocol + test })));
              });
            }
          }
        }
      }

      if (type === 'clips') {
        const protocols = ['', 'http://', 'https://'];
        for (const protocol of protocols) {
          for (const test of listOfTests) {
            it(`clip '${protocol}${test}' should timeout`, async () => {
              assert(!(await moderation.containsLink({ sender: user.viewer, message: test })));
            });
          }
        }
      }

      if (type === 'texts') {
        for (const test of listOfTests) {
          it(`text '${test}' should not timeout`, async () => {
            assert(await moderation.containsLink({ sender: user.viewer, message: test }));
          });
        }
      }
    }
  });
});
