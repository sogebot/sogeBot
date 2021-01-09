import { isNil } from 'lodash';

import { setTitleAndGame } from '../../microservices/setTitleAndGame';
import { default as custom_variables } from '../../widgets/customvariables';
import { rawStatus } from '../api';

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