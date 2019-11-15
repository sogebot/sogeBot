const { getRepository } = require('typeorm');
const { User } = require('../../dest/database/entity/user')

const viewer = {
  userId: 1,
  username: '__viewer__',
  badges: {},
  emotes: [],
};

module.exports = {
  prepare: async () => {
    await getRepository(User).save(viewer);
  },
  viewer,
};
