const viewer = {
  userId: 1,
  username: '__viewer__',
  badges: {},
  emotes: [],
};

module.exports = {
  prepare: async () => {
    await global.db.engine.update('users', { id: 1 }, viewer);
  },
  viewer,
};
