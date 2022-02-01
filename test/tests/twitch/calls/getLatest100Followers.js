const assert = require('assert');

const { getRepository } = require('typeorm');

const { User } = require('../../../../dest/database/entity/user');
const { prepare } = require('../../../../dest/helpers/commons/prepare');
const changelog = (require('../../../../dest/helpers/user/changelog'));
const eventlist = (require('../../../../dest/overlays/eventlist')).default;
const twitch = (require('../../../../dest/services/twitch')).default;
const { getLatest100Followers } = require('../../../../dest/services/twitch/calls/getLatest100Followers');
const db = require('../../../general.js').db;
const message = require('../../../general.js').message;
const time = require('../../../general.js').time;
const user = require('../../../general.js').user;

require('../../../general.js');

describe('lib/twitch/calls - getLatest100Followers() - @func1', () => {
  let beforeCount = 0;
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();
    beforeCount = await getRepository(User).count();
  });

  it('Run getLatest100Followers()', async () => {
    await getLatest100Followers();
  });

  it('All 100 followers should be processed', async () => {
    const timeout = Date.now() + 10000;
    let allProcessed = false;
    let processed = 0;
    while (timeout > Date.now()) {
      await changelog.flush();
      processed = await getRepository(User).count() - beforeCount;
      if (processed === 100) {
        allProcessed = true;
        break;
      }
    }
    assert(allProcessed, `Expected 100 users processed, got ${processed}`);
  });

  it('As we have hour limit, 60 users should trigger follow event', async () => {
    const users = await getRepository(User).find();
    let count = 0;
    for (const u of users) {
      try {
        await message.debug('events', `User ${u.userName}#${u.userId} triggered follow event.`,  100);
        count++;
      } catch {
        continue;
      }
    }
    assert(count === 60, `Expected 60 users to trigger follow event, got ${count}`);

  });
});
