const { getRepository } = require('typeorm');
const { User } = require('../../dest/database/entity/user');

const viewer = {
  userId: 1,
  username: '__viewer__',
  badges: {},
  emotes: [],
};

const viewer2 = {
  userId: 3,
  username: '__viewer2__',
  badges: {},
  emotes: [],
};

const viewer3 = {
  userId: 5,
  username: '__viewer3__',
  badges: {},
  emotes: [],
};

const owner = {
  userId: 2,
  username: '__broadcaster__',
  badges: {},
  emotes: [],
};

const mod = {
  userId: 4,
  username: '__mod__',
  badges: {},
  emotes: [],
  isModerator: true,
};

module.exports = {
  prepare: async () => {
    const { default: oauth } = require('../../dest/oauth');

    await getRepository(User).save(viewer);
    await getRepository(User).save(viewer2);
    await getRepository(User).save(viewer3);
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
