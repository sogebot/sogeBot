import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';
import defaultValues from '~/helpers/overlaysDefaultValues';

// import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateOverlayToGroup1675089806897 implements MigrationInterface {
  name = 'updateOverlayToGroup1675089806897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "overlay" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "canvas" text NOT NULL, "items" text NOT NULL)`);
    const items = await queryRunner.query(`SELECT * from "overlay_mapper"`);

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
          item.opts = {
            typeId: itemFromDB.value,
            ...JSON.parse(itemFromDB.opts === null ? '{}' : itemFromDB.opts),
          };
          newGroup.items.push(item);
        }
      }
      newGroup = defaultValues(newGroup);
      console.log(`Creating group ${newGroup.name}#${newGroup.id} with ${newGroup.items.length} item(s).`);
      insertItemIntoTable('overlay', newGroup, queryRunner);
    }

    for (const item of items.filter((o: any) => o.value === null)) {
      console.log('Groupless item', item.id);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "overlay"`);
    return;
  }

}
