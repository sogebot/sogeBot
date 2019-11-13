import { Column, Entity, JoinColumn, ManyToOne,OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Variable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @OneToMany(() => VariableHistory, (v) => v.variable, {
    cascade: true,
  })
  history!: VariableHistory[];
  @OneToMany(() => VariableURL, (v) => v.variable, {
    cascade: true,
  })
  urls!: VariableURL[];

  @Column()
  variableName!: string;
  @Column({ default: '' })
  description!: string;
  @Column()
  type!: 'eval' | 'number' | 'options' | 'text';
  @Column('simple-json')
  currentValue!: any;
  @Column('text')
  evalValue!: string;
  @Column({ default: 60000 })
  runEveryTypeValue!: number;
  @Column({ default: 'isUsed' })
  runEveryType!: string;
  @Column({ default: 60000 })
  runEvery!: number;
  @Column()
  responseType!: number;
  @Column({ default: '' })
  responseText!: string;
  @Column()
  permission!: string;
  @Column({ default: false })
  readOnly!: boolean;
  @Column('simple-array')
  usableOptions!: string[];
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  runAt!: number;
};

@Entity()
export class VariableHistory {
  @PrimaryGeneratedColumn()
  id!: number;
  @ManyToOne(() => Variable, (variable) => variable.history, {
    onDelete: 'CASCADE',
  })
  variable!: Variable;

  @Column({ default: 0 })
  userId!: number;
  @Column({ default: 'n/a' })
  username!: string;
  @Column('simple-json')
  currentValue!: any;
  @Column('simple-json')
  oldValue!: any;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  changedAt!: number;
}

@Entity()
export class VariableURL {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Variable, (variable) => variable.urls, {
    onDelete: 'CASCADE',
  })
  variable!: Variable;

  @Column({ default: false })
  GET!: boolean;
  @Column({ default: false })
  POST!: boolean;
  @Column({ default: false })
  showResponse!: boolean;
}

@Entity()
export class VariableWatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(type => Variable)
  @JoinColumn({ name: 'variable_id' })
  variable!: Variable;

  @Column({ name: 'variable_id' })
  variableId!: string;

  @Column()
  order!: number;
}