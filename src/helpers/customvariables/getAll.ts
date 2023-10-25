import { Variable } from '@entity/variable.js';

import { AppDataSource } from '~/database.js';

async function getAll() {
  return (await AppDataSource.getRepository(Variable).find()).reduce((prev: { [x: string]: any }, cur) => {
    return { ...prev, [cur.variableName]: cur.currentValue };
  }, {});
}

export { getAll };