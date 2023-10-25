import { readdirSync } from 'fs';
import { join, resolve  } from 'path';

export async function autoLoad(directory: string): Promise<{ [x: string]: any }> {
  const directoryListing = readdirSync(directory);
  const loaded: { [x: string]: any } = {};
  for (const file of directoryListing) {
    if (file.startsWith('_') || file.endsWith('.d.ts') || !file.endsWith('.js')) {
      continue;
    }
    const path = resolve(join(process.cwd(), directory, file));
    const imported = await import(`file://${path}`);
    if (typeof imported.default !== 'undefined') {
      loaded[file.split('.')[0]] = imported.default; // remap default to root object
    } else {
      loaded[file.split('.')[0]] = imported;
    }
  }
  return loaded;
}