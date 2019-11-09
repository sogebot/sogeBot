import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  @Index({ unique: true })
  command!: string;
  @Column({ default: true })
  enabled!: boolean;
  @Column()
  price!: number;
};