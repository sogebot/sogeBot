import { PermissionCommands } from '@entity/permissions';

async function getCommandPermission(commandArg: string): Promise<string | null | undefined> {
  const cItem = await PermissionCommands.findOne({ name: commandArg });
  if (cItem) {
    return cItem.permission;
  } else {
    return undefined;
  }
}

export { getCommandPermission };