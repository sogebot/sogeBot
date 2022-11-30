import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';
import { BotEntity } from '~/database/BotEntity';

@Entity()
@Unique('IDX_d8a83b9ffce680092c8dfee37d', [ 'namespace', 'name' ])
export class Settings extends BotEntity<Settings> {
  @PrimaryColumn({ generated: 'rowid' })
    id: number;

  @Column()
    namespace: string;

  @Column()
    name: string;

  @Column({ type: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') ? 'longtext' : 'text' })
    value: string;
}
