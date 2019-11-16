import { User } from '../database/entity/user';
import { getRepository } from 'typeorm';

export const getAllOnlineUsernames = async () => {
  return (await getRepository(User).find({ where: { isOnline: true }})).map(o => o.username);
};