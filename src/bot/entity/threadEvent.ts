import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ThreadEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  event!: string
}