const { getRepository } = require('typeorm');

const { User } = require('../../dest/database/entity/user');

const viewer = {
  userId:   '1',
  userName: '__viewer__',
  badges:   {},
  emotes:   [],
};

const viewer2 = {
  userId:   '3',
  userName: '__viewer2__',
  badges:   {},
  emotes:   [],
};

const viewer3 = {
  userId:   '5',
  userName: '__viewer3__',
  badges:   {},
  emotes:   [],
};

const viewer4 = {
  userId:   '50',
  userName: '__viewer4__',
  badges:   {},
  emotes:   [],
};

const viewer5 = {
  userId:   '55',
  userName: '__viewer5__',
  badges:   {},
  emotes:   [],
};

const viewer6 = {
  userId:   '56',
  userName: '__viewer6__',
  badges:   {},
  emotes:   [],
};

const viewer7 = {
  userId:   '57',
  userName: '__viewer7__',
  badges:   {},
  emotes:   [],
};

const owner = {
  userId:   '2',
  userName: '__broadcaster__',
  badges:   {},
  emotes:   [],
};

const mod = {
  userId:      '4',
  userName:    '__mod__',
  badges:      {},
  emotes:      [],
  isModerator: true,
  isMod:       true,
};

module.exports = {
  prepare: async () => {
    const { cleanViewersCache } = require('../../dest/helpers/permissions/cache');

    await getRepository(User).save(viewer);
    await getRepository(User).save(viewer2);
    await getRepository(User).save(viewer3);
    await getRepository(User).save(viewer4);
    await getRepository(User).save(viewer5);
    await getRepository(User).save(viewer6);
    await getRepository(User).save(viewer7);
    await getRepository(User).save(owner);
    await getRepository(User).save(mod);
    // clean perm cache
    cleanViewersCache();
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
