import { IsNotEmpty, MinLength } from 'class-validator';
import { AfterInsert, AfterUpdate, AfterRemove, BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { IsCommand } from '../validators/IsCommand';
import { IsCommandOrCustomVariable } from '../validators/IsCommandOrCustomVariable';

import * as cache from '~/helpers/cache/alias';

@Entity()
export class Alias extends BaseEntity {
  @AfterInsert()
  @AfterUpdate()
  @AfterRemove()
  invalidateCache() {
    cache.invalidate();
  }

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
  @AfterInsert()
  @AfterUpdate()
  @AfterRemove()
  invalidateCache() {
    cache.invalidate();
  }

  @PrimaryColumn()
  @Index('IDX_alias_group_unique_name', { unique: true })
    name: string;

  @Column({ type: 'simple-json' })
    options: {
    filter: string | null;
    permission: string | null;
  };
}