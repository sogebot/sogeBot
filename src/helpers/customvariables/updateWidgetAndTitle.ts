import { isNil } from 'lodash';

import { default as custom_variables } from '../../widgets/customvariables';
import { rawStatus } from '../api';

import { setTitleAndGame } from '~/services/twitch/calls/setTitleAndGame';

async function updateWidgetAndTitle (variable: string | null = null) {
  if (custom_variables.socket) {
    custom_variables.socket.emit('refresh');
  } // send update to widget

  if (isNil(variable)) {
    const regexp = new RegExp(`\\${variable}`, 'ig');

    if (rawStatus.value.match(regexp)) {
      setTitleAndGame({});
    }
  }
}

export { updateWidgetAndTitle };