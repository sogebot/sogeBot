import { Column, Entity, Index, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @OneToMany(() => EventOperation, (table) => table.event, {
    cascade: true,
  })
  operations!: EventOperation[];

  @Column()
  @Index()
  name!: string;
  @Column()
  givenName!: string;
  @Column()
  isEnabled!: boolean;

  @Column('simple-json')
  triggered: any;
  @Column('simple-json')
  definitions!: Events.OperationDefinitions;
  @Column()
  filter!: string;
};

@Entity()
export class EventOperation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Event, (table) => table.operations, {
    onDelete: 'CASCADE',
  })
  event!: Event;

  @Column()
  @Index()
  name!: string;

  @Column('simple-json')
  definitions!: Events.OperationDefinitions;
};