import { Entity, PrimaryColumn, Column } from 'typeorm';

import { BotEntity } from '../BotEntity.js';

@Entity()
export class Checklist extends BotEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  isCompleted: boolean;
}