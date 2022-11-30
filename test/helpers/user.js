const { User } = require('../../dest/database/entity/user');
const { AppDataSource } = require('../../dest/database');
const changelog = require('../../dest/helpers/user/changelog');

const viewer = {
  points: 0,
  userId:   '1',
  userName: '__viewer__',
  badges:   {},
  emotes:   [],
};

const viewer2 = {
  points: 0,
  userId:   '3',
  userName: '__viewer2__',
  badges:   {},
  emotes:   [],
};

const viewer3 = {
  points: 0,
  userId:   '5',
  userName: '__viewer3__',
  badges:   {},
  emotes:   [],
};

const viewer4 = {
  points: 0,
  userId:   '50',
  userName: '__viewer4__',
  badges:   {},
  emotes:   [],
};

const viewer5 = {
  points: 0,
  userId:   '55',
  userName: '__viewer5__',
  badges:   {},
  emotes:   [],
};

const viewer6 = {
  points: 0,
  userId:   '56',
  userName: '__viewer6__',
  badges:   {},
  emotes:   [],
};

const viewer7 = {
  points: 0,
  userId:   '57',
  userName: '__viewer7__',
  badges:   {},
  emotes:   [],
};

const owner = {
  points: 0,
  userId:   '2',
  userName: '__broadcaster__',
  badges:   {},
  emotes:   [],
};

const mod = {
  points: 0,
  userId:      '4',
  userName:    '__mod__',
  badges:      {},
  emotes:      [],
  isModerator: true,
  isMod:       true,
};

module.exports = {
  prepare: async () => {
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
  },
  viewer,
  viewer2,
  viewer3,
  viewer4,
  viewer5,
  viewer6,
  viewer7,
  owner,
  mod,
};
