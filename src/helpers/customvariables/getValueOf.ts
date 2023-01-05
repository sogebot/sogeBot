import { Variable } from '@entity/variable';
import { isNil } from 'lodash';
import { AppDataSource } from '~/database';

import { check } from '../permissions/check';
import { runScript } from './runScript';

async function getValueOf (variableName: string, opts?: any) {
  if (!variableName.startsWith('$_')) {
    variableName = `$_${variableName}`;
  }
  const item = await AppDataSource.getRepository(Variable).findOneBy({ variableName });
  if (!item) {
    return '';
  } // return empty if variable doesn't exist

  let currentValue = item.currentValue;
  if (item.type === 'eval' && item.runEvery === 0 ) {
    // recheck permission as this may go outside of setValueOf
    const permissionsAreValid = isNil(opts?.sender) || (await check(opts.sender.userId, item.permission, false)).access;
    if (permissionsAreValid) {
      currentValue = await runScript(item.evalValue, {
        _current: item.currentValue,
        ...opts,
      });
      await AppDataSource.getRepository(Variable).save({ ...item, currentValue });
    }
  }

  return currentValue;
}

export { getValueOf };