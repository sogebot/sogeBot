import { Variable, VariableInterface } from '@entity/variable';
import { getRepository } from 'typeorm';

async function addChangeToHistory(opts: { sender: any; item: VariableInterface; oldValue: any }) {
  const variable = await getRepository(Variable).findOneBy({
    relations: ['history'],
    where:     { id: opts.item.id },
  });
  if (variable) {
    variable.history.push({
      username:     opts.sender?.username ?? 'n/a',
      userId:       opts.sender?.userId ?? 0,
      oldValue:     opts.oldValue,
      currentValue: opts.item.currentValue,
      changedAt:    Date.now(),
      variableId:   variable.id,
    });
    await getRepository(Variable).save(variable);
  }
}

export { addChangeToHistory };