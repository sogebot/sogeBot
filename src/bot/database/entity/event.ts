import { EntitySchema } from 'typeorm';

export interface EventInterface {
  id?: string;
  operations: Omit<EventOperationInterface, 'event'>[];
  name: string;
  givenName: string;
  isEnabled: boolean;
  triggered: any;
  definitions: Events.OperationDefinitions;
  filter: string;
}

export interface EventOperationInterface {
  id?: string;
  event: EventInterface;
  name: string;
  definitions: Events.OperationDefinitions;
}

export const Event = new EntitySchema<Readonly<Required<EventInterface>>>({
  name: 'event',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    name: { type: String },
    givenName: { type: String },
    isEnabled: { type: Boolean },
    triggered: { type: 'simple-json' },
    definitions: { type: 'simple-json' },
    filter: { type: String },
  },
  relations: {
    operations: {
      type: 'one-to-many',
      target: 'event_operation',
      inverseSide: 'event',
      cascade: true,
    },
  },
  indices: [
    { name: 'IDX_b535fbe8ec6d832dde22065ebd', columns: ['name'] },
  ],
});

export const EventOperation = new EntitySchema<Readonly<Required<EventOperationInterface>>>({
  name: 'event_operation',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    name: { type: String },
    definitions: { type: 'simple-json' },
  },
  relations: {
    event: {
      type: 'many-to-one',
      target: 'event',
      inverseSide: 'operations',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
  indices: [
    { name: 'IDX_daf6b97e1e5a5c779055fbb22d', columns: ['name'] },
  ],
});