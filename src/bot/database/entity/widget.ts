import { Column, Entity, PrimaryColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class WidgetSocial {
  @PrimaryColumn()
  id!: string;

  @Column()
  type!: string;
  @Column()
  hashtag!: string;
  @Column('text')
  text!: string;
  @Column()
  username!: string;
  @Column()
  displayname!: string;
  @Column()
  url!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer(), default: 0 })
  timestamp!: number;
}