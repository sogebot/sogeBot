import { IsNotEmpty } from 'class-validator';
import { Entity, PrimaryColumn, Column, BaseEntity } from 'typeorm';

import { translate } from '../../translate';

@Entity()
export class Plugin extends BaseEntity {

  @PrimaryColumn()
    id: string;

  @Column()
  @IsNotEmpty({ message: () => translate('ui.errors.isNotEmpty') })
    name: string;

  @Column()
    enabled: boolean;

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