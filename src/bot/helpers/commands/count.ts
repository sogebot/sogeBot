import { CommandsCount } from '../../database/entity/commands';
import { getRepository } from 'typeorm';

export async function getCountOfCommandUsage (command: string): Promise<number> {
  return getRepository(CommandsCount).count({ command });
}

export async function incrementCountOfCommandUsage (command: string): Promise<number> {
  await getRepository(CommandsCount).insert({ command, timestamp: Date.now() });
  return getCountOfCommandUsage(command);
}

export async function resetCountOfCommandUsage (command: string): Promise<void> {
  return getRepository(CommandsCount).clear();
}

export async function getAllCountOfCommandUsage (): Promise<{ command: string; count: number }[]> {
  return getRepository(CommandsCount)
    .createQueryBuilder()
    .select('command')
    .addSelect('COUNT(command)', 'count')
    .groupBy('command')
    .getRawMany();
}
