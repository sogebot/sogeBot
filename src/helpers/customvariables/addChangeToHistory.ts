import { Variable } from '@entity/variable.js';

async function addChangeToHistory(opts: { sender: any; item: Variable; oldValue: any }) {
  const variable = await Variable.findOneBy({ id: opts.item.id });
  if (variable) {
    variable.history.push({
      username:     opts.sender?.username ?? 'n/a',
      userId:       opts.sender?.userId ?? 0,
      oldValue:     opts.oldValue,
      currentValue: opts.item.currentValue,
      changedAt:    new Date().toISOString(),
    });
    await variable.save();
  }
}

export { addChangeToHistory };