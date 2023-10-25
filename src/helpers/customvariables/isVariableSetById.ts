import { Variable } from '@entity/variable.js';

import { AppDataSource } from '~/database.js';

async function isVariableSetById (id: string) {
  return AppDataSource.getRepository(Variable).findOneBy({ id });
}

export { isVariableSetById };