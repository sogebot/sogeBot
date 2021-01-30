import { isNil } from 'lodash';

import { translate } from '../../translate';
import { getValueOf, isVariableSet } from '../customvariables';
import { rawStatus } from './cache';

async function parseTitle (title: string | null) {
  if (isNil(title)) {
    title = rawStatus.value;
  }

  const regexp = new RegExp('\\$_[a-zA-Z0-9_]+', 'g');
  const match = title.match(regexp);

  if (!isNil(match)) {
    for (const variable of match) {
      let value;
      if (await isVariableSet(variable)) {
        value = await getValueOf(variable);
      } else {
        value = translate('webpanel.not-available');
      }
      title = title.replace(new RegExp(`\\${variable}`, 'g'), value);
    }
  }
  return title;
}

export { parseTitle };