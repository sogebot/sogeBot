import { Variable } from '@entity/variable';
import { AppDataSource } from '~/database';

async function isVariableSetById (id: string) {
  return AppDataSource.getRepository(Variable).findOneBy({ id });
}

export { isVariableSetById };