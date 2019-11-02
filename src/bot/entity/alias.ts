import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Alias {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  alias!: string;
  @Column()
  command!: string;
  @Column()
  enabled!: boolean;
  @Column()
  visible!: boolean;
  @Column()
  permission!: string;
};