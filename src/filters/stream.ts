import { param } from './param.js';

import type { ResponseFilter } from './index.js';

import twitch from '~/services/twitch.js';

const stream: ResponseFilter = {
  '(stream|#|link)': async function (filter, attr) {
    let channel = filter.replace('(stream|', '').replace('|link)', '');

    // handle edge case when channel is parameter in checkFilter
    if (channel === '$param' || channel === '$touser') {
      channel = await param.$param('', attr);
    }

    channel = channel.replace('@', '');

    if (channel.trim().length === 0) {
      return '';
    }
    return `twitch.tv/${channel}`;
  },
  '(stream|#|game)': async function (filter, attr) {
    let channel = filter.replace('(stream|', '').replace('|game)', '');

    // handle edge case when channel is parameter in checkFilter
    if (channel === '$param' || channel === '$touser') {
      channel = await param.$param('', attr);
    }

    channel = channel.replace('@', '');

    try {
      const getUserByName = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(channel));
      if (!getUserByName) {
        throw new Error();
      }

      const getChannelInfo = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.channels.getChannelInfoById(getUserByName.id));
      if (!getChannelInfo) {
        throw new Error();
      }
      return `'${getChannelInfo.gameName}'`;
    } catch (e) {
      return 'n/a';
    }
  },
  '(stream|#|title)': async function (filter, attr) {
    let channel = filter.replace('(stream|', '').replace('|title)', '');

    // handle edge case when channel is parameter in checkFilter
    if (channel === '$param' || channel === '$touser') {
      channel = await param.$param('', attr);
    }

    channel = channel.replace('@', '');

    try {
      const getUserByName = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserByName(channel));
      if (!getUserByName) {
        throw new Error();
      }

      const getChannelInfo = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.channels.getChannelInfoById(getUserByName.id));
      if (!getChannelInfo) {
        throw new Error();
      }
      return `'${getChannelInfo.title}'`;
    } catch (e) {
      return 'n/a';
    }
  },
  '(stream|#|viewers)': async function (filter, attr) {
    let channel = filter.replace('(stream|', '').replace('|viewers)', '');

    // handle edge case when channel is parameter in checkFilter
    if (channel === '$param' || channel === '$touser') {
      channel = await param.$param('', attr);
    }

    channel = channel.replace('@', '');

    try {
      const getStreams = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.streams.getStreams({ userName: channel }));
      if (!getStreams) {
        throw new Error();
      }
      return `${getStreams.data[0].viewers}`;
    } catch (e) {
      return '0';
    }
  },
  '(stream|#|status)': async function (filter, attr) {
    let channel = filter.replace('(stream|', '').replace('|status)', '');

    // handle edge case when channel is parameter in checkFilter
    if (channel === '$param' || channel === '$touser') {
      channel = await param.$param('', attr);
    }

    channel = channel.replace('@', '');

    try {
      const getStreams = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.streams.getStreams({ userName: channel, type: 'live' }));
      if (!getStreams || getStreams.data.length === 0) {
        throw new Error();
      }
      return `live`;
    } catch (e) {
      return 'offline';
    }
  },
};

export { stream };