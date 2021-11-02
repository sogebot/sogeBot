import axios from 'axios';

import type { ResponseFilter } from '.';

import { setRateLimit } from '~/helpers/api';
import oauth from '~/services/twitch/oauth';

const stream: ResponseFilter = {
  '(stream|#|link)': async function (filter: any) {
    const channel = filter.replace('(stream|', '').replace('|link)', '').replace('@', '');

    if (channel.trim().length === 0) {
      return '';
    }

    return `twitch.tv/${channel}`;
  },
  '(stream|#|game)': async function (filter: any) {
    const channel = filter.replace('(stream|', '').replace('|game)', '').replace('@', '');

    const token = await oauth.botAccessToken;
    if (token === '') {
      return 'n/a';
    }

    try {
      let request = await axios.get<any>(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });
      const channelId = request.data.data[0].id;
      request = await axios.get<any>(`https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });

      return `'${request.data.data[0].game_name}'`;
    } catch (e: any) {
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
      let request = await axios.get<any>(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });

      const channelId = request.data.data[0].id;
      request = await axios.get<any>(`https://api.twitch.tv/helix/channels?broadcaster_id=${channelId}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });
      // save remaining api calls
      setRateLimit('bot', request.headers as any);
      return `'${request.data.data[0].title}'`;
    } catch (e: any) {
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
      let request = await axios.get<any>(`https://api.twitch.tv/helix/users?login=${channel}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });
      const channelId = request.data.data[0].id;
      request = await axios.get<any>(`https://api.twitch.tv/helix/streams?user_id=${channelId}`, {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Client-ID':     oauth.botClientId,
        },
      });
      // save remaining api calls
      setRateLimit('bot', request.headers as any);
      return request.data.data[0].viewer_count;
    } catch (e: any) {
      return '0';
    } // return nothing on error
  },
};

export { stream };