const assert = require('assert');

const { getRepository } = require('typeorm');

const { User } = require('../../../dest/database/entity/user');
const changelog = require('../../../dest/helpers/user/changelog');
const points = (require('../../../dest/systems/points')).default;
require('../../general.js');
const db = require('../../general.js').db;
const message = require('../../general.js').message;
const user = require('../../general.js').user;

describe('Points - User have proper points count - https://discord.com/channels/317348946144002050/689472714544513025/1010671480973041844 - @func3', () => {
  before(async () => {
    await db.cleanup();
    await message.prepare();
    await user.prepare();

    await getRepository(User).update({ userName: user.viewer.userName }, { isOnline: true });

    points.messageOfflineInterval = 5;
    points.perMessageOfflineInterval = 1;
    points.offlineInterval = 10; // every 10 minutes
    points.perOfflineInterval = 10;
  });

  it('!points set points to 0', async () => {
    const r = await points.set({ sender: user.owner, parameters: user.viewer.userName + ' 0' });
    assert.strictEqual(r[0].response, `@${user.viewer.userName} was set to 0 points`);
  });

  it('User sends 50 messages', async () => {
    for (let i = 0; i < 50; i++) {
      changelog.increment(user.viewer.userId, { messages: 1 });
      await points.messagePoints({ sender: user.viewer, skip: false, message: '' });
    }
  });

  it('!points get should return 10 points', async () => {
    const r = await points.get({ sender: user.viewer, parameters: '' });
    assert.strictEqual(r[0].response, `@${user.viewer.userName} has currently 10 points. Your position is 1/9.`);
  });

  it('Set user pointsOfflineGivenAt to 0 and chatTimeOffline to 10 minutes', async () => {
    changelog.update(user.viewer.userId, { chatTimeOffline: 60000 * 10, pointsOfflineGivenAt: 0 });
  });

  it('Trigger updatePoints()', async () => {
    await points.updatePoints();
  });

  it('!points get should return 20 points', async () => {
    const r = await points.get({ sender: user.viewer, parameters: '' });
    assert.strictEqual(r[0].response, `@${user.viewer.userName} has currently 20 points. Your position is 1/9.`);
  });

  it('Set user and chatTimeOffline to 20 minutes', async () => {
    changelog.update(user.viewer.userId, { chatTimeOffline: 60000 * 20 });
  });

  it('Trigger updatePoints()', async () => {
    await points.updatePoints();
  });

  it('!points get should return 30 points', async () => {
    const r = await points.get({ sender: user.viewer, parameters: '' });
    assert.strictEqual(r[0].response, `@${user.viewer.userName} has currently 30 points. Your position is 1/9.`);
  });

  it('Set user chatTimeOffline to 9 hours', async () => {
    changelog.update(user.viewer.userId, { chatTimeOffline: 60000 * 60 * 9 });
  });

  it('Trigger updatePoints()', async () => {
    await points.updatePoints();
  });

  it('!points get should return 550 points', async () => {
    const r = await points.get({ sender: user.viewer, parameters: '' });
    assert.strictEqual(r[0].response, `@${user.viewer.userName} has currently 550 points. Your position is 1/9.`);
  });
});
