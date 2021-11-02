import { Variable } from '@entity/variable';
import { getRepository } from 'typeorm';

async function getAll() {
  return (await getRepository(Variable).find()).reduce((prev: { [x: string]: any }, cur) => {
    return { ...prev, [cur.variableName]: cur.currentValue };
  }, {});
}

export { getAll };