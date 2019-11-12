import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from '../../../dest/entity/_transformer';

@Entity()
export class Changelog {
  @PrimaryGeneratedColumn()
  id!: number;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
  @Column()
  threadId!: string;
  @Column()
  namespace!: string;
}