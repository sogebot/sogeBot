import { AppDataSource } from '../../dest/database.js'
import { User } from '../../dest/database/entity/user.js'
import * as changelog from '../../dest/helpers/user/changelog.js'
import emitter from '../../dest/helpers/interfaceEmitter.js'

export const viewer = {
  points:   0,
  userId:   '1',
  userName: '__viewer__',
  badges:   {},
  emotes:   [],
};

export const viewer2 = {
  points:   0,
  userId:   '3',
  userName: '__viewer2__',
  badges:   {},
  emotes:   [],
};

export const viewer3 = {
  points:   0,
  userId:   '5',
  userName: '__viewer3__',
  badges:   {},
  emotes:   [],
};

export const viewer4 = {
  points:   0,
  userId:   '50',
  userName: '__viewer4__',
  badges:   {},
  emotes:   [],
};

export const viewer5 = {
  points:   0,
  userId:   '55',
  userName: '__viewer5__',
  badges:   {},
  emotes:   [],
};

export const viewer6 = {
  points:   0,
  userId:   '56',
  userName: '__viewer6__',
  badges:   {},
  emotes:   [],
};

export const viewer7 = {
  points:   0,
  userId:   '57',
  userName: '__viewer7__',
  badges:   {},
  emotes:   [],
};

export const owner = {
  points:   0,
  userId:   '2',
  userName: '__broadcaster__',
  badges:   {},
  emotes:   [],
};

export const mod = {
  points:      0,
  userId:      '4',
  userName:    '__mod__',
  badges:      {},
  emotes:      [],
  isModerator: true,
  isMod:       true,
};

export const prepare = async () => {
  await changelog.flush();
  await AppDataSource.getRepository(User).save(viewer);
  await AppDataSource.getRepository(User).save(viewer2);
  await AppDataSource.getRepository(User).save(viewer3);
  await AppDataSource.getRepository(User).save(viewer4);
  await AppDataSource.getRepository(User).save(viewer5);
  await AppDataSource.getRepository(User).save(viewer6);
  await AppDataSource.getRepository(User).save(viewer7);
  await AppDataSource.getRepository(User).save(owner);
  await AppDataSource.getRepository(User).save(mod);
  emitter.emit('set', '/services/twitch', 'broadcasterUsername', owner.userName);
  emitter.emit('set', '/services/twitch', 'broadcasterId', owner.userId);
  await new Promise((resolve => {
    setTimeout(() =>{
      resolve();
    }, 1000);
  }));
}
