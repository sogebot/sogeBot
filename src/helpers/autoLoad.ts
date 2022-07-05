import { readdirSync } from 'fs';
import { join, normalize } from 'path';

export async function autoLoad(directory: string): Promise<{ [x: string]: any }> {
  const directoryListing = readdirSync(directory);
  const loaded: { [x: string]: any } = {};
  for (const file of directoryListing) {
    if (file.startsWith('_') || file.endsWith('.d.ts')) {
      continue;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const imported = require(normalize(join(process.cwd(), directory, file)));
    if (typeof imported.default !== 'undefined') {
      loaded[file.split('.')[0]] = imported.default; // remap default to root object
    } else {
      loaded[file.split('.')[0]] = imported;
    }
  }
  return loaded;
}