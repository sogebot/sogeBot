import { Variable } from '@entity/variable';
import { AppDataSource } from '~/database';

async function isVariableSet (variableName: string) {
  return AppDataSource.getRepository(Variable).findOneBy({ variableName });
}

export { isVariableSet };