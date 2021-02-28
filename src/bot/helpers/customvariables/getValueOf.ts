import { isNil } from 'lodash';
import { getRepository } from 'typeorm';

import { Variable } from '../../database/entity/variable';
import { addToViewersCache, getFromViewersCache } from '../permissions';
import { check } from '../permissions/';
import { runScript } from './runScript';

async function getValueOf (variableName: string, opts?: any) {
  if (!variableName.startsWith('$_')) {
    variableName = `$_${variableName}`;
  }
  const item = await getRepository(Variable).findOne({ variableName });
  if (!item) {
    return '';
  } // return empty if variable doesn't exist

  let currentValue = item.currentValue;
  if (item.type === 'eval' && item.runEveryType === 'isUsed' ) {
    // recheck permission as this may go outside of setValueOf
    if (opts?.sender) {
      if (typeof getFromViewersCache(opts.sender.userId, item.permission) === 'undefined') {
        addToViewersCache(opts.sender.userId, item.permission, (await check(opts.sender.userId, item.permission, false)).access);
      }
    }
    const permissionsAreValid = isNil(opts?.sender) || getFromViewersCache(opts.sender.userId, item.permission);
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