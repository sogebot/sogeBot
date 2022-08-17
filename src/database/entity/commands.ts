import { IsNotEmpty, MinLength } from 'class-validator';
import { ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity, Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { IsCommand } from '../validators/IsCommand';

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

  @OneToMany(() => CommandsResponses, (item) => item.command)
    responses: CommandsResponses[];
}

@Entity()
export class CommandsResponses extends BaseEntity {
  @PrimaryColumn({ generated: 'uuid', type: 'uuid' })
    id: string;

  @Column()
    order: number;

  @Column({ type: 'text' })
    response: string;

  @Column()
    stopIfExecuted: boolean;

  @Column({ nullable: true, type: String })
    permission: string | null;

  @Column()
    filter: string;

  @ManyToOne(() => Commands, (item) => item.responses, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
    command: Commands;
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