import { getRepository } from 'typeorm';

import { Variable } from '../../database/entity/variable';

async function getAll() {
  return (await getRepository(Variable).find()).reduce((prev: { [x: string]: any }, cur) => {
    return { ...prev, [cur.variableName]: cur.currentValue };
  }, {});
}

export { getAll };