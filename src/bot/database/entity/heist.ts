import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class HeistUser {
  @PrimaryColumn()
  userId!: number;
  @Column()
  username!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  points!: number;
};