import { isNil } from 'lodash-es';

import { default as custom_variables } from '../../widgets/customvariables.js';
import { rawStatus } from '../api/index.js';

import { updateChannelInfo } from '~/services/twitch/calls/updateChannelInfo.js';

async function updateWidgetAndTitle (variable: string | null = null) {
  if (custom_variables.socket) {
    custom_variables.socket.emit('refresh');
  } // send update to widget

  if (isNil(variable)) {
    const regexp = new RegExp(`\\${variable}`, 'ig');

    if (rawStatus.value.match(regexp)) {
      updateChannelInfo({});
    }
  }
}

export { updateWidgetAndTitle };