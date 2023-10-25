/* global describe it before */

import('../../general.js');

import { db } from '../../general.js';
import { message } from '../../general.js';

const owner = { userName: '__broadcaster__', userId: String(Math.floor(Math.random() * 100000)) };
const someuser = { userName: 'someuser', userId: String(Math.floor(Math.random() * 100000)) };

import { AppDataSource } from '../../../dest/database.js';
import { User } from '../../../dest/database/entity/user.js';

import customcommands from '../../../dest/systems/customcommands.js';

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
