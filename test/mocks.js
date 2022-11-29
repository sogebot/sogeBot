const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { v4 } = require('uuid');

const { AppDataSource } = require('../dest/database');
const { User } = require('../dest/database/entity/user');
const users = require('./helpers/user');

const getLatest100FollowersMockData = [];
for (let i = 0; i < 100; i++) {
  // we want to have each follower every minute
  getLatest100FollowersMockData.push({
    'userId':     String(Math.floor(Math.random() * 10000000)),
    'userName':   v4(),
    'followDate': null, // we are refreshing on each call
  });
}

global.mockClient = (account) => {
  return {
    chat: {
      getGlobalEmotes:  () => ([]),
      getChannelEmotes: () => ([]),
    },
    users: {
      getUserByName: async (userName) => {
        console.log(`Mocking call users.getUserByName(${userName}) for ${account}`);
        let id = String(Math.floor(Math.random() * 100000));

        const user = await AppDataSource.getRepository(User).findOneBy({ userName });
        const mockUser = getLatest100FollowersMockData.find(o => o.userName === userName);
        if (user) {
          id = user.userId;
        } else if (mockUser) {
          id = mockUser.userId;
        } else {
          for (const key of Object.keys(users)) {
            if (users[key].userName === userName) {
              id = users[key].userId;
            }
          }
        }
        return {
          id,
          name:              userName,
          displayName:       userName,
          profilePictureUrl: '',
        };
      },
      getFollows: () => {
        console.log('Mocking call users.getFollows for ' + account);
        // update follow time
        for (let i = 0; i < 100; i++) {
          getLatest100FollowersMockData[i].followDate = new Date(Date.now() - (i * 60000));
        }
        return {
          data: getLatest100FollowersMockData,
        };
      },
    },
    clips: {
      getClipById: () => {
        console.log('Mocking call clips.getClipById for ' + account);
      },
    },
  };
};

global.mock = new MockAdapter(axios);
global.mock
  .onGet('http://localhost/get?test=a\\nb').reply(200, { test: 'a\\nb' })
  .onAny().passThrough(); // pass through others