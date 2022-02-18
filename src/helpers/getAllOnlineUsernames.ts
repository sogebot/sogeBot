import { User } from '@entity/user';
import { getRepository } from 'typeorm';

import * as changelog from '~/helpers/user/changelog';

export const getAllOnlineUsernames = async () => {
  await changelog.flush();
  return (await getRepository(User).find({ where: { isOnline: true } })).map(o => o.userName);
};

export const getAllOnlineIds = async () => {
  await changelog.flush();
  return (await getRepository(User).find({ where: { isOnline: true } })).map(o => o.userId);
};