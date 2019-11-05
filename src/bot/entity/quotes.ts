import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Quotes {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('simple-array')
  tags!: string[];

  @Column()
  quote!: string;

  @Column()
  quotedBy!: string;

  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  createdAt!: number;
};