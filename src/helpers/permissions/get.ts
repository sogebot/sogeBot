import { Permissions, PermissionsInterface } from '@entity/permissions';
import { getRepository } from 'typeorm';

async function get(identifier: string): Promise<PermissionsInterface | undefined> {
  const uuidRegex = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
  if (identifier.search(uuidRegex) >= 0) {
    return getRepository(Permissions).findOne({ id: identifier });
  } else {
    // get first name-like
    return (await getRepository(Permissions).find()).find((o) => {
      return o.name.toLowerCase() === identifier.toLowerCase();
    }) || undefined;
  }
}

export { get };