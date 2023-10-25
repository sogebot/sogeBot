import { Permissions } from '@entity/permissions.js';

async function get(identifier: string): Promise<Permissions | null> {
  const uuidRegex = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;
  if (identifier.search(uuidRegex) >= 0) {
    return Permissions.findOneBy({ id: identifier });
  } else {
    // get first name-like
    return (await Permissions.find()).find((o) => {
      return o.name.toLowerCase() === identifier.toLowerCase();
    }) ?? null;
  }
}

export { get };