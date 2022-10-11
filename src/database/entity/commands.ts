import { IsNotEmpty, MinLength } from 'class-validator';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, RemoveEvent, UpdateEvent } from 'typeorm';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { IsCommand } from '../validators/IsCommand';

export const commands: Commands[] = [];
export const groups: CommandsGroup[] = [];
export const populateCache = () => {
  return Promise.all([
    new Promise((resolve) => {
      Commands.find()
        .then(items => {
          while (commands.length > 0) {
            commands.shift();
          }
          for (const o of items) {
            commands.push(o);
          }
          resolve(true);
        });
    }),
    new Promise((resolve) => {
      CommandsGroup.find()
        .then(items => {
          while (groups.length > 0) {
            groups.shift();
          }
          for (const o of items) {
            groups.push(o);
          }
          resolve(true);
        });
    }),
  ]);
};

@EventSubscriber()
export class CommandsSubscriber implements EntitySubscriberInterface<Commands> {
  listenTo() {
    return Commands;
  }
  afterInsert(event: InsertEvent<Commands>): void | Promise<any> {
    commands.push(event.entity);
  }
  afterUpdate(event: UpdateEvent<Commands>): void | Promise<any> {
    if (event.entity) {
      const idx = commands.findIndex(o => o.id === event.entity!.id);
      if (idx > -1) {
        Commands.merge(commands[idx], event.entity);
      }
    }
  }
  afterRemove(event: RemoveEvent<Commands>): void | Promise<any> {
    if (event.entity) {
      const idx = commands.findIndex(o => o.id === event.entity!.id);
      if (idx > -1) {
        commands.splice(idx, 1);
      }
    }
  }
}

@EventSubscriber()
export class CommandsGroupSubscriber implements EntitySubscriberInterface<CommandsGroup> {
  listenTo() {
    return CommandsGroup;
  }

  afterInsert(event: InsertEvent<CommandsGroup>): void | Promise<any> {
    groups.push(event.entity);
  }
  afterUpdate(event: UpdateEvent<CommandsGroup>): void | Promise<any> {
    if (event.entity) {
      const idx = groups.findIndex(o => o.name === event.entity!.name);
      if (idx > -1) {
        groups[idx] = event.entity as CommandsGroup;
      }
    }
  }
  afterRemove(event: RemoveEvent<CommandsGroup>): void | Promise<any> {
    if (event.entity) {
      const idx = groups.findIndex(o => o.name === event.entity!.name);
      if (idx > -1) {
        groups.splice(idx, 1);
      }
    }
  }
}

@Entity()
export class Commands extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @IsCommand()
  @Index('IDX_1a8c40f0a581447776c325cb4f')
    command: string;

  @Column()
    enabled: boolean;

  @Column()
    visible: boolean;

  @Column({ nullable: true, type: String })
    group: string | null;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    responses: {
    id: string;
    order: number;
    response: string;
    stopIfExecuted: boolean;
    permission: string | null;
    filter: string;
  }[] = [];
}

@Entity()
export class CommandsGroup extends BaseEntity {
  @PrimaryColumn()
  @Index('IDX_commands_group_unique_name', { unique: true })
    name: string;

  @Column({ type: 'simple-json' })
    options: {
    filter: string | null;
    permission: string | null;
  };
}

@Entity()
export class CommandsCount extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Index('IDX_2ccf816b1dd74e9a02845c4818')
  @Column()
    command: string;

  @Column({ type: 'varchar', length: '2022-07-27T00:30:34.569259834Z'.length })
    timestamp: string;
}