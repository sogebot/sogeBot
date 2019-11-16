import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class EventList {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  event!: string;

  @Column()
  @Index()
  username!: string;

  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  timestamp!: number;

  @Column('text')
  values_json!: string;
}