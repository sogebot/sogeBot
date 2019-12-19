import { Column, Entity, Index, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Commands {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index()
  command!: string;
  @Column()
  enabled!: boolean;
  @Column()
  visible!: boolean;
  @OneToMany(() => CommandsResponses, (response) => response.command, {
    cascade: true,
  })
  responses!: CommandsResponses[];
};

@Entity()
export class CommandsResponses {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Commands, (command) => command.responses, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  command!: Commands;
  @Column()
  order!: number;
  @Column('text')
  response!: string;
  @Column()
  stopIfExecuted!: boolean;
  @Column()
  permission!: string;
  @Column()
  filter!: string;
};

@Entity()
export class CommandsCount {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  @Index()
  command!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  timestamp!: number;
};

@Entity()
export class CommandsBoard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  order!: number;
  @Column()
  text!: string;
  @Column()
  command!: string;


}