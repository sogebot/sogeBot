import { Variable } from '@entity/variable.js';

import { AppDataSource } from '~/database.js';

async function isVariableSet (variableName: string) {
  return AppDataSource.getRepository(Variable).findOneBy({ variableName });
}

export { isVariableSet };