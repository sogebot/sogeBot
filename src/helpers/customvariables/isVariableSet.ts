import { Variable } from '@entity/variable';
import { getRepository } from 'typeorm';

async function isVariableSet (variableName: string) {
  return getRepository(Variable).findOne({ variableName });
}

export { isVariableSet };