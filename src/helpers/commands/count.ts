import { CommandsCount } from '@entity/commands.js';
import { MINUTE } from '@sogebot/ui-helpers/constants.js';

import { AppDataSource } from '~/database.js';

const count: { command: string, timestamp: string }[] = [];

setInterval(() => {
  const length = count.length;
  for (let i = 0; i < length; i++) {
    const c = new CommandsCount();
    c.command = count[i].command;
    c.timestamp = count[i].timestamp;
    c.save();
  }
  count.splice(0,length);
}, MINUTE);

export async function getCountOfCommandUsage (command: string): Promise<number> {
  return (await CommandsCount.countBy({ command }) + count.filter(o => o.command === command).length);
}

export function incrementCountOfCommandUsage (command: string): void {
  count.push({ command, timestamp: new Date().toISOString() });
}

export async function resetCountOfCommandUsage (command: string): Promise<void> {
  CommandsCount.delete({ command });
  count.splice(0,count.length);
}

export async function getAllCountOfCommandUsage (): Promise<{ command: string; count: number }[]> {
  return AppDataSource.getRepository(CommandsCount)
    .createQueryBuilder()
    .select('command')
    .addSelect('COUNT(command)', 'count')
    .groupBy('command')
    .getRawMany();
}
