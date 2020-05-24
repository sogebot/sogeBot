import { EntitySchema } from 'typeorm';
import { ColumnNumericTransformer } from './_transformer';

export interface DashboardInterface {
  id?: string;
  widgets?: WidgetInterface[];
  name: string;
  createdAt: number;
  type: 'admin' | 'mod' | 'viewer';
  userId: number;
}

export interface WidgetInterface {
  id?: string;
  dashboardId?: string;
  dashboard?: DashboardInterface;
  name: string;
  positionX: number;
  positionY: number;
  height: number;
  width: number;
}

export const Dashboard = new EntitySchema<Readonly<Required<DashboardInterface>>>({
  name: 'dashboard',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    name: { type: String },
    type: { type: String, length: 6 },
    userId: { type: Number },
    createdAt: { type: 'bigint', transformer: new ColumnNumericTransformer() },
  },
  relations: {
    widgets: {
      type: 'one-to-many',
      target: 'widget',
      inverseSide: 'dashboard',
      cascade: true,
    },
  },
});

export const Widget = new EntitySchema<Readonly<Required<WidgetInterface>>>({
  name: 'widget',
  columns: {
    id: { type: String, primary: true, generated: 'uuid' },
    name: { type: String },
    positionX: { type: Number },
    positionY: { type: Number },
    height: { type: Number },
    width: { type: Number },
    dashboardId: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'sqlite') ? { type: 'varchar', length: '36', nullable: true } : { type: 'uuid', nullable: true },
  },
  relations: {
    dashboard: {
      type: 'many-to-one',
      target: 'dashboard',
      joinColumn: { name: 'dashboardId' },
      inverseSide: 'widgets',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
  },
});