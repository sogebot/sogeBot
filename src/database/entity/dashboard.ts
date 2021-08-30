import { EntitySchema } from 'typeorm';

export type CommandItem = QuickActions.defaultAttributes & {
  type: 'command',
  options: QuickActions.defaultOptions & {
    command: string,
  },
};
export type CustomVariableItem = QuickActions.defaultAttributes & {
  type: 'customvariable',
  options: QuickActions.defaultOptions & {
    customvariable: string,
  },
};
export type RandomizerItem = QuickActions.defaultAttributes & {
  type: 'randomizer',
  options: QuickActions.defaultOptions & {
    randomizerId: string,
  },
};
export declare namespace QuickActions {
  type defaultAttributes = {
    id: string,
    userId: string,
    order: number,
  };

  type defaultOptions = {
    label: string,
    color: string,
  };

  type Item = CommandItem | CustomVariableItem | RandomizerItem;
}

export const QuickAction = new EntitySchema<Readonly<Required<QuickActions.Item>>>({
  name:    'quickaction',
  columns: {
    id: {
      type: 'uuid', primary: true, generated: 'uuid',
    },
    userId:  { type: String },
    order:   { type: Number },
    type:    { type: String },
    options: { type: 'simple-json' },
  },
});