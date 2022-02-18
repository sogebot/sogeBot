import { buildSchemaSync }  from 'type-graphql';

import { customAuthChecker } from './auth';
import * as resolvers from './resolvers';

const schema = buildSchemaSync({
  resolvers:      Object.values(resolvers) as any,
  authChecker:    customAuthChecker,
  dateScalarMode: 'timestamp', // "timestamp" or "isoDate"
});

export { schema };