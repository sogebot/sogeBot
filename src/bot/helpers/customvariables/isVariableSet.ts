import { getRepository } from 'typeorm';

import { Variable } from '../../database/entity/variable';

async function isVariableSet (variableName: string) {
  return getRepository(Variable).findOne({ variableName });
}

export { isVariableSet };