import { MigrationInterface, QueryRunner } from 'typeorm';

export class addMissingAttributes1635599216112 implements MigrationInterface {
  name = 'addMissingAttributes1635599216112';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query('SELECT * FROM overlay_mapper', undefined);
    for (const item of items) {
      let opts: Record<string, any> = {};
      if (item.opts) {
        opts = JSON.parse(item.opts);
      }
      if(['credits'].includes(item.value)) {
        for (const item2 of opts.customTexts) {
          delete item2.text;
          if (typeof item2.right === 'undefined') {
            item2.right = '';
          }
          if (typeof item2.left === 'undefined') {
            item2.left = '';
          }
          if (typeof item2.middle === 'undefined') {
            item2.middle = '';
          }
        }
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
