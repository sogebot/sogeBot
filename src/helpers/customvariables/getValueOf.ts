import { Variable } from '@entity/variable';
import { isNil } from 'lodash';
import { getRepository } from 'typeorm';

import { check } from '../permissions/';
import { runScript } from './runScript';

async function getValueOf (variableName: string, opts?: any) {
  if (!variableName.startsWith('$_')) {
    variableName = `$_${variableName}`;
  }
  const item = await getRepository(Variable).findOneBy({ variableName });
  if (!item) {
    return '';
  } // return empty if variable doesn't exist

  let currentValue = item.currentValue;
  if (item.type === 'eval' && item.runEveryType === 'isUsed' ) {
    // recheck permission as this may go outside of setValueOf
    const permissionsAreValid = isNil(opts?.sender) || (await check(opts.sender.userId, item.permission, false)).access;
    if (permissionsAreValid) {
      currentValue = await runScript(item.evalValue, {
        _current: item.currentValue,
        ...opts,
      });
      await getRepository(Variable).save({ ...item, currentValue });
    }
  }

  return currentValue;
}

export { getValueOf };