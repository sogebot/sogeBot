import { debounce } from 'lodash-es';

import { rawStatus } from '../api/index.js';

import { updateChannelInfo } from '~/services/twitch/calls/updateChannelInfo.js';

const updateWidgetAndTitle = debounce(async (variable: string | null = null) => {
  console.log('updateWidgetAndTitle', variable);
  if (variable) {
    const regexp = new RegExp(`\\${variable}`, 'ig');

    if (rawStatus.value.match(regexp)) {
      await updateChannelInfo({});
    }
  }
}, 500, { trailing: true, maxWait: 5000 });

export { updateWidgetAndTitle };