import client from '../services/twitch/api/client';

import type { ResponseFilter } from '.';

const stream: ResponseFilter = {
  '(stream|#|link)': async function (filter: string) {
    const channel = filter.replace('(stream|', '').replace('|link)', '').replace('@', '');

    if (channel.trim().length === 0) {
      return '';
    }

    return `twitch.tv/${channel}`;
  },
  '(stream|#|game)': async function (filter: string) {
    const channel = filter.replace('(stream|', '').replace('|game)', '').replace('@', '');
    try {
      const clientBot = await client('bot');
      const getUserByName = await clientBot.users.getUserByName(channel);
      if (!getUserByName) {
        throw new Error();
      }

      const getChannelInfo = await clientBot.channels.getChannelInfo(getUserByName.id);
      if (!getChannelInfo) {
        throw new Error();
      }
      return `'${getChannelInfo.gameName}'`;
    } catch (e) {
      return 'n/a';
    }
  },
  '(stream|#|title)': async function (filter: string) {
    const channel = filter.replace('(stream|', '').replace('|title)', '').replace('@', '');
    try {
      const clientBot = await client('bot');
      const getUserByName = await clientBot.users.getUserByName(channel);
      if (!getUserByName) {
        throw new Error();
      }

      const getChannelInfo = await clientBot.channels.getChannelInfo(getUserByName.id);
      if (!getChannelInfo) {
        throw new Error();
      }
      return `'${getChannelInfo.title}'`;
    } catch (e) {
      return 'n/a';
    }
  },
  '(stream|#|viewers)': async function (filter: string) {
    const channel = filter.replace('(stream|', '').replace('|viewers)', '');
    try {
      const clientBot = await client('bot');
      const getStreams = await clientBot.streams.getStreams({ userName: channel });
      if (getStreams.data.length === 0) {
        throw new Error();
      }
      return `${getStreams.data[0].viewers}`;
    } catch (e) {
      return '0';
    }
  },
  '(stream|#|status)': async function (filter: string) {
    const channel = filter.replace('(stream|', '').replace('|status)', '');
    try {
      const clientBot = await client('bot');
      const getStreams = await clientBot.streams.getStreams({ userName: channel });
      if (getStreams.data.length === 0) {
        throw new Error();
      }
      return `live`;
    } catch (e) {
      return 'offline';
    }
  },
};

export { stream };