import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Highlight {
  @PrimaryGeneratedColumn()
  id!: string;
  @Column()
  videoId!: string;
  @Column()
  game!: string;
  @Column()
  title!: string;
  @Column('simple-json')
  timestamp!: {
    hours: number; minutes: number; seconds: number;
  };
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  createdAt!: number;
}
