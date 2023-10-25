import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BotEntity } from '../BotEntity.js';

@Entity('obswebsocket')
export class OBSWebsocket extends BotEntity {
  @PrimaryColumn({ type: 'varchar', length: '14' })
    id: string;

  @Column()
    name: string;

  @Column({ type: 'text' })
    code: string;
}