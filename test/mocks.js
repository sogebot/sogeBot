const MockAdapter = require('axios-mock-adapter');
const axios = require('axios')

global.mock = new MockAdapter(axios);
global.mock
  .onGet('http://localhost/get?test=a\\nb').reply(200, {
    test: 'a\\nb'
  })
  .onGet('https://api.twitch.tv/helix/users/follows?to_id=12345&first=100').reply(200, {
    'total': 12345,
    'data': [
      {
        'from_id': '171003792',
        'from_name': 'IIIsutha067III',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': '2017-08-22T22:55:24Z'
      },
      {
        'from_id': '113627897',
        'from_name': 'Birdman616',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': '2017-08-22T22:55:04Z'
      },
      {
        'from_id': '111',
        'from_name': 'testfollow',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': String(new Date())
      },
      {
        'from_id': '222',
        'from_name': 'testfollow2',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': String(new Date())
      },
      {
        'from_id': '333',
        'from_name': '__bot_username__',
        'to_id': '23161357',
        'to_name': 'LIRIK',
        'followed_at': String(new Date())
      }
    ],
    'pagination': {
      'cursor': 'eyJiIjpudWxsLCJhIjoiMTUwMzQ0MTc3NjQyNDQyMjAwMCJ9'
    }
  }, {
    'ratelimit-remaining': 800,
    'ratelimit-reset': 0,
    'ratelimit-limit': 800
  })
  .onAny().passThrough(); // pass through others