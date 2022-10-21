import { BotEntity } from '../BotEntity';
import { Index, Column, PrimaryColumn, EventSubscriber, RemoveEvent, UpdateEvent, InsertEvent, EntitySubscriberInterface } from 'typeorm';

export const permissionCommands: PermissionCommands[] = [];
export const populateCache = () => {
  return Promise.all([
    new Promise((resolve) => {
      PermissionCommands.find()
        .then(items => {
          while (permissionCommands.length > 0) {
            permissionCommands.shift();
          }
          for (const o of items) {
            permissionCommands.push(o);
          }
          resolve(true);
        });
    }),
  ]);
};

@EventSubscriber()
export class PermissionCommandsSubscriber implements EntitySubscriberInterface<PermissionCommands> {
  listenTo() {
    return PermissionCommands;
  }
  afterInsert(event: InsertEvent<PermissionCommands>): void | Promise<any> {
    permissionCommands.push(event.entity);
  }
  afterUpdate(event: UpdateEvent<PermissionCommands>): void | Promise<any> {
    if (event.entity) {
      const idx = permissionCommands.findIndex(o => o.id === event.entity!.id);
      if (idx > -1) {
        PermissionCommands.merge(permissionCommands[idx], event.entity);
      }
    }
  }
  afterRemove(event: RemoveEvent<PermissionCommands>): void | Promise<any> {
    if (event.entity) {
      const idx = permissionCommands.findIndex(o => o.id === event.entity!.id);
      if (idx > -1) {
        permissionCommands.splice(idx, 1);
      }
    }
  }
}

export class Permissions extends BotEntity<Permissions> {
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
    name: string;

  @Column()
    order: number;

  @Column()
    isCorePermission:   boolean;

  @Column()
    isWaterfallAllowed: boolean;

  @Column({ type: 'varchar', length: 12 })
    automation: string;

  @Column({ type: 'simple-array' })
    userIds:            string[];
  @Column({ type: 'simple-array' })
    excludeUserIds:     string[];

  @Column({ type: (process.env.TYPEORM_CONNECTION ?? 'better-sqlite3') !== 'better-sqlite3' ? 'json' : 'simple-json' })
    filters: {
    comparator: '<' | '>' | '==' | '<=' | '>=';
    type: 'level' | 'ranks' | 'points' | 'watched' | 'tips' | 'bits' | 'messages' | 'subtier' | 'subcumulativemonths' | 'substreakmonths';
    value: string;
  }[];
}

export class PermissionCommands extends BotEntity<PermissionCommands>{
  @PrimaryColumn({ generated: 'uuid' })
    id: string;

  @Column()
  @Index('IDX_ba6483f5c5882fa15299f22c0a')
    name: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
    permission: string | null;
}