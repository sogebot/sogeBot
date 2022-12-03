import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BotEntity } from '~/database/BotEntity';

@Entity('obswebsocket')
export class OBSWebsocket extends BotEntity<OBSWebsocket> {
  @PrimaryColumn({ type: 'varchar', length: '14' })
    id: string;

  @Column()
    name: string;

  @Column({ type: 'text' })
    code: string;
}