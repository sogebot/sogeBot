import { isNil } from 'lodash';

import api from '../../api';
import { setTitleAndGame } from '../../microservices/setTitleAndGame';
import { default as custom_variables } from '../../widgets/customvariables';

async function updateWidgetAndTitle (variable: string | null = null) {
  if (custom_variables.socket) {
    custom_variables.socket.emit('refresh');
  } // send update to widget

  if (isNil(variable)) {
    const regexp = new RegExp(`\\${variable}`, 'ig');

    if (api.rawStatus.match(regexp)) {
      setTitleAndGame({});
    }
  }
}

export { updateWidgetAndTitle };