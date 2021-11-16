import { defaultsDeep } from 'lodash';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class addMissingAttributes1635599216111 implements MigrationInterface {
  name = 'addMissingAttributes1635599216111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query('SELECT * FROM overlay_mapper', undefined);
    for (const item of items) {
      let opts: Record<string, any> = {};
      if (item.opts) {
        opts = JSON.parse(item.opts);
      }
      if(['alerts'].includes(item.value)) {
        opts = defaultsDeep(opts ?? {}, {
          galleryCache:          false,
          galleryCacheLimitInMb: 50,
        });
      }
      const keys = Object.keys(item);
      item.opts = JSON.stringify(opts);
      await queryRunner.query('DELETE FROM `overlay_mapper` WHERE `id`=?', [item.id]);
      await queryRunner.query(
        `INSERT INTO \`overlay_mapper\`(${keys.map(o => `\`${o}\``).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        keys.map(key => item[key]),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
