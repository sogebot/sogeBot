import { Variable, VariableInterface } from '@entity/variable';
import { AppDataSource } from '~/database';

async function addChangeToHistory(opts: { sender: any; item: VariableInterface; oldValue: any }) {
  const variable = await AppDataSource.getRepository(Variable).findOne({
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
    await AppDataSource.getRepository(Variable).save(variable);
  }
}

export { addChangeToHistory };