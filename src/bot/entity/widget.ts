import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class WidgetSocial {
  @PrimaryColumn()
  id!: string;

  @Column()
  type!: string;
  @Column()
  hashtag!: string;
  @Column('text')
  text!: string;
  @Column()
  username!: string;
  @Column()
  displayname!: string;
  @Column()
  url!: string;
}