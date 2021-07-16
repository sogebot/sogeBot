import { getRepository } from 'typeorm';

import { User } from '../database/entity/user';

export const getAllOnlineUsernames = async () => {
  return (await getRepository(User).find({ where: { isOnline: true } })).map(o => o.username);
};