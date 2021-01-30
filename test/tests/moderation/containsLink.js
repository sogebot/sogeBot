/* global describe it before */

const assert = require('assert');

require('../../general.js');

const moderation = (require('../../../dest/systems/moderation')).default;
const db = require('../../general.js').db;
const variable = require('../../general.js').variable;
const message = require('../../general.js').message;
const user = require('../../general.js').user;
const time = require('../../general.js').time;

const tests = {
  'clips': [
    'clips.twitch.tv/TolerantExquisiteDuckOneHand',
    'www.twitch.tv/7ssk7/clip/StormyBraveAniseM4xHeh?filter=clips&range=30d&sort=time', // https://discordapp.com/channels/317348946144002050/619437014001123338/713323104574898186
  ],
  'links': [ // tests will test links, http://links, https://links
    'foobarpage.me',
    'foobarpage.shop',
    'foobarpage.com',
    'foobarpage.COM',
    'FOOBARPAGE.com',
    'FOOBARPAGE.COM',
    'foobarpage .com',
    'foobarpage .COM',
    'FOOBARPAGE .com',
    'FOOBARPAGE .COM',
    'foobarpage . com',
    'foobarpage . COM',
    'FOOBARPAGE . com',
    'FOOBARPAGE . COM',
    'foobarpage . com',
    'www.foobarpage.com',
    'www.foobarpage.COM',
    'www.FOOBARPAGE.com',
    'www.FOOBARPAGE.COM',
    'WWW.FOOBARPAGE.COM',
    'www.foobarpage .com',
    'www.foobarpage .COM',
    'www.FOOBARPAGE .com',
    'www.FOOBARPAGE .COM',
    'WWW.FOOBARPAGE .COM',
    'www.foobarpage . com',
    'www.foobarpage . COM',
    'www.FOOBARPAGE . com',
    'www.FOOBARPAGE . COM',
    'WWW.FOOBARPAGE . COM',
    'www. foobarpage.com',
    'www. foobarpage.COM',
    'www. FOOBARPAGE.com',
    'www. FOOBARPAGE.COM',
    'WWW. FOOBARPAGE.COM',
    'youtu.be/123jAJD123',
  ],
  'texts': [
    '#42 - proc hrajes tohle auto je dost na nic ....',
    '#44 - 1.2.3.4',
    '#47 - vypadá že máš problémy nad touto počítačovou hrou....doporučuji tvrdý alkohol',
    'community/t/links-detection/183 - die Zellen sind nur dafür da um deine Maschinen zu überlasten bzw. stärker und schneller zu machen',
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
            if (test.indexOf(' ') > -1 && test.toLowerCase().indexOf('www. ') === -1) { // even if moderationLinksWithSpaces is false - www. FOOBARPAGE.com should be timeouted
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

  describe('immune user', async () => {
    before(async () => {
      await db.cleanup();
      await message.prepare();
      await user.prepare();
      moderation.cLinksEnabled = true;
    });

    it(`'www.google.com' should timeout`, async () => {
      assert(!(await moderation.containsLink({ sender: user.viewer, message: 'www.google.com' })));
    });

    it(`add user immunity`, async () => {
      const r = await moderation.immune({ parameters: `${user.viewer.username} links 5s` });
      assert(r[0].response === '$sender, user @__viewer__ have links immunity for 5 seconds');
    });

    it(`'www.google.com' should not timeout`, async () => {
      assert((await moderation.containsLink({ sender: user.viewer, message: 'www.google.com' })));
    });

    it(`wait 10 seconds`, async () => {
      await time.waitMs(10000);
    });

    it(`'www.google.com' should timeout`, async () => {
      assert(!(await moderation.containsLink({ sender: user.viewer, message: 'www.google.com' })));
    });
  });
});
