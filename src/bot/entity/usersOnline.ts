import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UsersOnline {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Index({ unique: true })
  username!: string;
}