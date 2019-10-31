import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class EventList {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  event!: string;

  @Column()
  @Index()
  username!: string;

  @Column()
  timestamp!: number;

  @Column()
  values_json!: string;
}