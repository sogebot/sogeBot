import { MigrationInterface, QueryRunner } from 'typeorm';

export class addMissingShowMilliseconds1635453652530 implements MigrationInterface {
  name = 'addMissingShowMilliseconds1635453652530';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query('SELECT * FROM `overlay_mapper`', undefined);
    for (const item of items) {
      if(['stopwatch', 'countdown', 'marathon'].includes(item.value)) {
        const opts: Record<string, any> = JSON.parse(item.opts);
        if (typeof opts.showMilliseconds === 'undefined') {
          opts.showMilliseconds = false;
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
