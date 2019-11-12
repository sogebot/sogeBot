import { Column, Entity, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Variable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @OneToMany(() => VariableHistory, (response) => response.variable, {
    cascade: true,
  })
  history!: VariableHistory[];

  @Column()
  variableName!: string;
  @Column()
  type!: 'eval' | 'number' | 'options' | 'text';
  @Column('simple-json')
  currentValue!: any;
  @Column('simple-json')
  @Column('text')
  evalValue!: string;
  @Column()
  runEvery!: number;
  @Column()
  responseType!: number;
  @Column({ default: '' })
  responseText!: string;
  @Column()
  permission!: string;
  @Column({ default: false })
  readOnly!: boolean;
  @Column('simple-array', { default: [] })
  usableOptions!: string[];
};

@Entity()
export class VariableHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Variable, (variable) => variable.history, {
    onDelete: 'CASCADE',
  })
  variable!: Variable;
}