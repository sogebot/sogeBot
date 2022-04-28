import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

@Entity()
export class Plugin extends BaseEntity {

  @PrimaryColumn()
    id: string;

  @Column()
    name: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'longtext' : 'text' })
    workflow: string;
}

@Entity()
export class PluginVariable extends BaseEntity {

  @PrimaryColumn()
    variableName: string;

  @PrimaryColumn()
    pluginId: string;

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') === 'mysql' ? 'longtext' : 'text' })
    value: string;
}