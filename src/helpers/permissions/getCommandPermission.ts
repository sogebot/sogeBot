import { PermissionCommands } from '@entity/permissions.js';

async function getCommandPermission(commandArg: string): Promise<string | null | undefined> {
  const cItem = await PermissionCommands.findOneBy({ name: commandArg });
  if (cItem) {
    return cItem.permission;
  } else {
    return undefined;
  }
}

export { getCommandPermission };