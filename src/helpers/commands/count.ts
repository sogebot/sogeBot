import { MINUTE } from '@sogebot/ui-helpers/constants';
import { getRepository } from 'typeorm';

import { CommandsCount } from '../../database/entity/commands';

const count: { command: string, timestamp: number }[] = [];

setInterval(() => {
  const length = count.length;
  for (let i = 0; i < length; i++) {
    getRepository(CommandsCount).insert({ command: count[i].command, timestamp: count[i].timestamp });
  }
  count.splice(0,length);
}, MINUTE);

export async function getCountOfCommandUsage (command: string): Promise<number> {
  return (await getRepository(CommandsCount).count({ command }) + count.filter(o => o.command === command).length);
}

export async function incrementCountOfCommandUsage (command: string): Promise<void> {
  count.push({ command, timestamp: Date.now() });
}

export async function resetCountOfCommandUsage (command: string): Promise<void> {
  getRepository(CommandsCount).delete({ command });
  count.splice(0,count.length);
}

export async function getAllCountOfCommandUsage (): Promise<{ command: string; count: number }[]> {
  return getRepository(CommandsCount)
    .createQueryBuilder()
    .select('command')
    .addSelect('COUNT(command)', 'count')
    .groupBy('command')
    .getRawMany();
}
