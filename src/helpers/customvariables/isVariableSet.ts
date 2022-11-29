import { Variable } from '@entity/variable';
import { getRepository } from 'typeorm';

async function isVariableSet (variableName: string) {
  return getRepository(Variable).findOneBy({ variableName });
}

export { isVariableSet };