import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class CacheTitles {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index()
  game!: string;

  @Column()
  title!: string;

  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  timestamp!: number;
}