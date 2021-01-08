import axios from 'axios';

import api from '../api';
import oauth from '../oauth';

import { ResponseFilter } from '.';

const stream: ResponseFilter = {
  '(stream|#|game)': async function (filter: any) {
    const channel = filter.replace('(stream|', '').replace('|game)', '').replace('@', '');

    const token = await oauth.botAccessToken;
    if (token === '') {
      return 'n/a';
    }

    try {
      let request = await axios.get(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });
      const channelId = request.data.data[0].id;
      request = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });

      return `'${request.data.data[0].game_name}'`;
    } catch (e) {
      return 'n/a';
    } // return nothing on error
  },
  '(stream|#|title)': async function (filter: any) {
    const channel = filter.replace('(stream|', '').replace('|title)', '').replace('@', '');

    const token = await oauth.botAccessToken;
    if (token === '') {
      return 'n/a';
    }

    try {
      let request = await axios.get(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });

      const channelId = request.data.data[0].id;
      request = await axios.get(`https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });
      // save remaining api calls
      api.calls.bot.remaining = request.headers['ratelimit-remaining'];
      api.calls.bot.refresh = request.headers['ratelimit-reset'];
      return `'${request.data.data[0].title}'`;
    } catch (e) {
      return 'n/a';
    } // return nothing on error
  },
  '(stream|#|viewers)': async function (filter: any) {
    const channel = filter.replace('(stream|', '').replace('|viewers)', '');

    const token = await oauth.botAccessToken;
    if (token === '') {
      return '0';
    }

    try {
      let request = await axios.get(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });
      const channelId = request.data.data[0].id;
      request = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID': oauth.botClientId,
        },
      });
      // save remaining api calls
      api.calls.bot.remaining = request.headers['ratelimit-remaining'];
      api.calls.bot.refresh = request.headers['ratelimit-reset'];
      return request.data.data[0].viewer_count;
    } catch (e) {
      return '0';
    } // return nothing on error
  },
};

export { stream };