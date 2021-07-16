import { getRepository } from 'typeorm';

import { Variable } from '../../database/entity/variable';

async function isVariableSetById (id: string) {
  return getRepository(Variable).findOne({ id });
}

export { isVariableSetById };