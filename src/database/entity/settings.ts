import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';

@Entity()
@Index('IDX_d8a83b9ffce680092c8dfee37d', [ 'namespace', 'name' ], { unique: true })
export class Settings extends BotEntity {
  @PrimaryColumn({ generated: 'rowid' })
    id: number;

  @Column()
    namespace: string;

  @Column()
    name: string;

  @Column({ type: ['mysql', 'mariadb'].includes(process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') ? 'longtext' : 'text' })
    value: string;
}
