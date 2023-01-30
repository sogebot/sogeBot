import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class stringifyOverlayGroup1634053219263 implements MigrationInterface {
  name = 'stringifyOverlayGroup1634053219263';

  public async up(queryRunner: QueryRunner): Promise < void > {
    return;
    const mapper = await queryRunner.query(`SELECT * from "overlay_mapper"`);

    for (const group of mapper as any) {
      if (group.value === 'group') {
        for (const item of group.opts.items) {
          item.opts = JSON.stringify(item.opts);
        }
      }
      await queryRunner.manager.getRepository(`overlay_mapper`).save(group);
    }
  }

  public async down(queryRunner: QueryRunner): Promise < void > {
    return;
  }

}
