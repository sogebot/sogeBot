import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class UsersOnline {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    unique: true,
  })
  username!: string
}