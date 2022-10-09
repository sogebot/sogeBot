import { IsNotEmpty, MinLength } from 'class-validator';
import { BaseEntity, Column, Entity, Index, PrimaryColumn, EventSubscriber, EntitySubscriberInterface } from 'typeorm';

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
  afterInsert(): void | Promise<any> {
    return populateCache();
  }
  afterUpdate(): void | Promise<any> {
    return populateCache();
  }
  afterRemove(): void | Promise<any> {
    return populateCache();
  }
}

@EventSubscriber()
export class AliasGroupSubscriber implements EntitySubscriberInterface<AliasGroup> {
  listenTo() {
    return AliasGroup;
  }
  afterInsert(): void | Promise<any> {
    return populateCache();
  }
  afterUpdate(): void | Promise<any> {
    return populateCache();
  }
  afterRemove(): void | Promise<any> {
    return populateCache();
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