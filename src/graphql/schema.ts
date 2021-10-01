import { buildSchemaSync }  from 'type-graphql';

import { customAuthChecker } from './auth.js';
import { AliasResolver } from './resolvers/aliasResolver.js';

const schema = buildSchemaSync({
  resolvers:   [AliasResolver],
  authChecker: customAuthChecker,
});

export { schema };