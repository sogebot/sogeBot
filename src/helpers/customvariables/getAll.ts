import { Variable } from '@entity/variable';
import { AppDataSource } from '~/database';

async function getAll() {
  return (await AppDataSource.getRepository(Variable).find()).reduce((prev: { [x: string]: any }, cur) => {
    return { ...prev, [cur.variableName]: cur.currentValue };
  }, {});
}

export { getAll };