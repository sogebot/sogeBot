import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UsersOnline {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    unique: true,
  })
  username!: string;
}