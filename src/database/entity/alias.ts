import { IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, Entity, Index, PrimaryColumn, EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';

import { IsCommand } from '../validators/IsCommand';
import { IsCommandOrCustomVariable } from '../validators/IsCommandOrCustomVariable';

export const aliases: Alias[] = [];
export const groups: AliasGroup[] = [];
export const populateCache = () => {
  return Promise.all([
    new Promise((resolve) => {
      Alias.find()
        .then(items => {
          while (aliases.length > 0) {
            aliases.shift();
          }
          for (const o of items) {
            aliases.push(o);
          }
          resolve(true);
        });
    }),
    new Promise((resolve) => {
      AliasGroup.find()
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
export class AliasSubscriber implements EntitySubscriberInterface<Alias> {
  listenTo() {
    return Alias;
  }
  afterInsert(event: InsertEvent<Alias>): void | Promise<any> {
    aliases.push(event.entity);
  }
  afterUpdate(event: UpdateEvent<Alias>): void | Promise<any> {
    if (event.entity) {
      const idx = aliases.findIndex(o => o.id === event.entity!.id);
      if (idx > -1) {
        Alias.merge(aliases[idx], event.entity);
      }
    }
  }
  afterRemove(event: RemoveEvent<Alias>): void | Promise<any> {
    if (event.entity) {
      const idx = aliases.findIndex(o => o.id === event.entity!.id);
      if (idx > -1) {
        aliases.splice(idx, 1);
      }
    }
  }
}

@EventSubscriber()
export class AliasGroupSubscriber implements EntitySubscriberInterface<AliasGroup> {
  listenTo() {
    return AliasGroup;
  }
  afterInsert(event: InsertEvent<AliasGroup>): void | Promise<any> {
    groups.push(event.entity);
  }
  afterUpdate(event: UpdateEvent<AliasGroup>): void | Promise<any> {
    if (event.entity) {
      const idx = groups.findIndex(o => o.name === event.entity!.name);
      if (idx > -1) {
        AliasGroup.merge(groups[idx], event.entity);
      }
    }
  }
  afterRemove(event: RemoveEvent<AliasGroup>): void | Promise<any> {
    if (event.entity) {
      const idx = groups.findIndex(o => o.name === event.entity!.name);
      if (idx > -1) {
        groups.splice(idx, 1);
      }
    }
  }
}

@Entity()
export class Alias extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @IsNotEmpty()
  @MinLength(2)
  @IsCommand()
  @Index('IDX_6a8a594f0a5546f8082b0c405c')
    alias: string;

  @Column({ type: 'text' })
  @IsCommandOrCustomVariable()
  @MinLength(2)
  @IsNotEmpty()
    command: string;

  @Column()
    enabled: boolean;

  @Column()
    visible: boolean;

  @Column({ nullable: true, type: String })
    permission: string | null;

  @Column({ nullable: true, type: String })
    group: string | null;
}

@Entity()
export class AliasGroup extends BaseEntity {
  @PrimaryColumn()
  @Index('IDX_alias_group_unique_name', { unique: true })
    name: string;

  @Column({ type: 'simple-json' })
    options: {
    filter: string | null;
    permission: string | null;
  };
}