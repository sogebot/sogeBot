import { Column, Entity, Index, ManyToOne,OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Permissions {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column()
  name!: string;
  @Column()
  order!: number;
  @Column()
  isCorePermission!: boolean;
  @Column()
  isWaterfallAllowed!: boolean;
  @Column('varchar', { length: 12 })
  automation!: 'none' | 'casters' | 'moderators' | 'subscribers' | 'viewers' | 'followers' | 'vip';
  @Column('simple-array')
  userIds!: string[];
  @OneToMany(() => PermissionFilters, (filter) => filter.permission, {
    cascade: true,
  })
  filters!: PermissionFilters[];
};

@Entity()
export class PermissionFilters {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @ManyToOne(() => Permissions, (permission) => permission.filters, {
    onDelete: 'CASCADE',
  })
  permission!: Permissions;
  @Column('varchar', { length: 3 })
  comparator!: '<' | '>' | '==' | '<=' | '>=';
  @Column('varchar')
  type!: 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths';
  @Column('bigint')
  value!: number;
};

@Entity()
export class PermissionCommands {
  @PrimaryGeneratedColumn()
  id!: string;
  @Index()
  @Column()
  key!: string;
  @Column()
  permission!: string;
};