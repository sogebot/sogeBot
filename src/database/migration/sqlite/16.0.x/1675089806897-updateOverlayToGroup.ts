import { MigrationInterface, QueryRunner } from 'typeorm';
import { v4 } from 'uuid';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';
import defaultValues from '~/helpers/overlaysDefaultValues';

export class updateOverlayToGroup1675089806897 implements MigrationInterface {
  name = 'updateOverlayToGroup1675089806897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "overlay" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "canvas" text NOT NULL, "items" text NOT NULL)`);
    const items = await queryRunner.query(`SELECT * from "overlay_mapper"`);
    await queryRunner.query(`DROP TABLE "overlay_mapper"`);

    for (const group of items.filter((o: any) => o.value === 'group')) {
      const opts = JSON.parse<any>(group.opts);

      let newGroup: any = {
        id:     group.id,
        name:   group.name,
        canvas: opts.canvas,
        items:  [],
      };

      for (const item of JSON.parse<any>(group.opts).items) {
        const itemId = item.id;
        const itemFromDB = items.find((o: any) => o.id === itemId);
        if (itemFromDB) {
          item.name = itemFromDB.name ?? '';
          item.isVisible = true;
          item.opts = {
            typeId: itemFromDB.value,
            ...JSON.parse(itemFromDB.opts === null ? '{}' : itemFromDB.opts),
          };
          newGroup.items.push(item);
        }
      }
      newGroup = defaultValues(newGroup);
      console.log(`Creating group ${newGroup.name}#${newGroup.id} with ${newGroup.items.length} item(s).`);
      newGroup.canvas = JSON.stringify(newGroup.canvas);
      newGroup.items = JSON.stringify(newGroup.items);
      insertItemIntoTable('overlay', newGroup, queryRunner);
    }

    for (const item of items.filter((o: any) => o.groupId === null && o.value !== 'group')) {
      let newGroup: any = {
        id:     item.id,
        name:   item.name ?? 'Group from ' + item.id,
        canvas: {
          width:  1920,
          height: 1080,
        },
        items: [{
          id:        v4(),
          width:     1920,
          height:    1080,
          alignX:    0,
          alignY:    0,
          isVisible: true,
          name:      item.name ?? '',
          opts:      {
            typeId: item.value,
            ...JSON.parse<any>(item.opts === null ? '{}' : item.opts),
          },
        }],
      };
      newGroup = defaultValues(newGroup);
      console.log(`Creating group ${newGroup.name}#${newGroup.id} with ${newGroup.items.length} item(s).`);
      newGroup.canvas = JSON.stringify(newGroup.canvas);
      newGroup.items = JSON.stringify(newGroup.items);
      insertItemIntoTable('overlay', newGroup, queryRunner);

    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "overlay"`);
    return;
  }

}
