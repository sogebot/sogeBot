import { getRepository } from 'typeorm';

import { PermissionCommands } from '../../database/entity/permissions';

async function getCommandPermission(commandArg: string): Promise<string | null | undefined> {
  const cItem = await getRepository(PermissionCommands).findOne({ name: commandArg });
  if (cItem) {
    return cItem.permission;
  } else {
    return undefined;
  }
}

export { getCommandPermission };