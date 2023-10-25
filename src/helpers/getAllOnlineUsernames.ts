import { User } from '@entity/user.js';

import { AppDataSource } from '~/database.js';
import * as changelog from '~/helpers/user/changelog.js';

export const getAllOnlineUsernames = async () => {
  await changelog.flush();
  return (await AppDataSource.getRepository(User).find({ where: { isOnline: true } })).map(o => o.userName);
};

export const getAllOnlineIds = async () => {
  await changelog.flush();
  return (await AppDataSource.getRepository(User).find({ where: { isOnline: true } })).map(o => o.userId);
};

export const getAllOnline = async () => {
  await changelog.flush();
  return await AppDataSource.getRepository(User).find({ where: { isOnline: true } });
};