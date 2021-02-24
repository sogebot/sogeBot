const { getRepository } = require('typeorm');

const { User } = require('../../dest/database/entity/user');

const viewer = {
  userId:   1,
  username: '__viewer__',
  badges:   {},
  emotes:   [],
};

const viewer2 = {
  userId:   3,
  username: '__viewer2__',
  badges:   {},
  emotes:   [],
};

const viewer3 = {
  userId:   5,
  username: '__viewer3__',
  badges:   {},
  emotes:   [],
};

const viewer4 = {
  userId:   50,
  username: '__viewer4__',
  badges:   {},
  emotes:   [],
};

const viewer5 = {
  userId:   55,
  username: '__viewer5__',
  badges:   {},
  emotes:   [],
};

const viewer6 = {
  userId:   56,
  username: '__viewer6__',
  badges:   {},
  emotes:   [],
};

const viewer7 = {
  userId:   57,
  username: '__viewer7__',
  badges:   {},
  emotes:   [],
};

const owner = {
  userId:   2,
  username: '__broadcaster__',
  badges:   {},
  emotes:   [],
};

const mod = {
  userId:      4,
  username:    '__mod__',
  badges:      {},
  emotes:      [],
  isModerator: true,
};

module.exports = {
  prepare: async () => {
    const { default: oauth } = require('../../dest/oauth');

    await getRepository(User).save(viewer);
    await getRepository(User).save(viewer2);
    await getRepository(User).save(viewer3);
    await getRepository(User).save(viewer4);
    await getRepository(User).save(viewer5);
    await getRepository(User).save(viewer6);
    await getRepository(User).save(viewer7);
    await getRepository(User).save(owner);
    await getRepository(User).save(mod);
    // set owner as broadcaster
    oauth.broadcasterUsername = owner.username;
  },
  viewer,
  viewer2,
  viewer3,
  owner,
  mod,
};
