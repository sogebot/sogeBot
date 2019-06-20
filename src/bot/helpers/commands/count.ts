export async function indexCommandUsageDb() {
  global.db.engine.index('core.commands.count', [{ index: 'timestamp' }, { index: 'command' }]);

}

export async function getCountOfCommandUsage (command: string): Promise<number> {
  const result = await global.db.engine.find('core.commands.count', { command });
  return result.length;
}

export async function incrementCountOfCommandUsage (command: string): Promise<number> {
  await global.db.engine.insert('core.commands.count', { command, timestamp: Date.now() });
  const result = await global.db.engine.find('core.commands.count', { command });
  return result.length;
}

export async function resetCountOfCommandUsage (command: string): Promise<void> {
  await global.db.engine.remove('core.commands.count', { command });
}
