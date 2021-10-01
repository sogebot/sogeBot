import { buildSchemaSync }  from 'type-graphql';

import { customAuthChecker } from './auth.js';
import * as resolvers from './resolvers';

const schema = buildSchemaSync({
  resolvers:   Object.values(resolvers) as any,
  authChecker: customAuthChecker,
});

export { schema };