import { Variable } from '@entity/variable';
import { getRepository } from 'typeorm';

async function isVariableSetById (id: string) {
  return getRepository(Variable).findOneBy({ id });
}

export { isVariableSetById };