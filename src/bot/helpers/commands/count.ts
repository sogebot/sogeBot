import { CommandsCount } from '../../entity/commands';
import { getRepository } from 'typeorm';

export async function getCountOfCommandUsage (command: string): Promise<number> {
  return getRepository(CommandsCount).count({ key: command });
}

export async function incrementCountOfCommandUsage (command: string): Promise<number> {
  await getRepository(CommandsCount).insert({ key: command, timestamp: Date.now() });
  return getCountOfCommandUsage(command);
}

export async function resetCountOfCommandUsage (command: string): Promise<void> {
  return getRepository(CommandsCount).clear();
}

export async function getAllCountOfCommandUsage (): Promise<CommandsCount[]> {
  return getRepository(CommandsCount)
    .createQueryBuilder()
    .select('cnt')
    .from(CommandsCount, 'cnt')
    .groupBy('cnt.key')
    .execute();
}
