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

const owner = {
  userId: 2,
  username: 'soge__',
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
    await getRepository(User).save(viewer);
    await getRepository(User).save(viewer2);
    await getRepository(User).save(owner);
    await getRepository(User).save(mod);
  },
  viewer,
  viewer2,
  owner,
  mod,
};
