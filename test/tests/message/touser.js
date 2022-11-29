/* global describe it before */

require('../../general.js');

const db = require('../../general.js').db;
const message = require('../../general.js').message;

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };
const someuser = { userName: 'someuser', userId: String(Math.floor(Math.random() * 100000)) };

const { AppDataSource } = require('../../../dest/database.js');
const { User } = require('../../../dest/database/entity/user');

const customcommands = (require('../../../dest/systems/customcommands')).default;

describe('Message - $touser filter - @func3', async () => {
  beforeEach(async () => {
    await db.cleanup();
    await message.prepare();

    await AppDataSource.getRepository(User).save(owner);
    await AppDataSource.getRepository(User).save(someuser);

    await customcommands.add({ sender: owner, parameters: '-c !point -r $sender points to $touser'});
  });

  it('!point someuser', async () => {
    customcommands.run({ sender: owner, message: '!point someuser' });
    await message.isSentRaw('@__broadcaster__ points to @someuser', owner);
  });

  it('!point @someuser', async () => {
    customcommands.run({ sender: owner, message: '!point @someuser' });
    await message.isSentRaw('@__broadcaster__ points to @someuser', owner);
  });

  it('!point', async () => {
    customcommands.run({ sender: owner, message: '!point' });
    await message.isSentRaw('@__broadcaster__ points to @__broadcaster__', owner);
  });

  it('!point @', async () => {
    customcommands.run({ sender: owner, message: '!point' });
    await message.isSentRaw('@__broadcaster__ points to @__broadcaster__', owner);
  });
});
