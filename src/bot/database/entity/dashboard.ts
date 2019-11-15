import { Column, Entity, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

@Entity()
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @OneToMany(() => Widget, (v) => v.dashboard, {
    cascade: true,
  })
  widgets!: Widget[];

  @Column()
  name!: string;
  @Column('bigint', { transformer: new ColumnNumericTransformer() })
  createdAt!: number;
};

@Entity()
export class Widget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Dashboard, (c) => c.widgets, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  dashboard!: Dashboard;

  @Column()
  name!: string;
  @Column()
  positionX!: number;
  @Column()
  positionY!: number;
  @Column()
  height!: number;
  @Column()
  width!: number;
};