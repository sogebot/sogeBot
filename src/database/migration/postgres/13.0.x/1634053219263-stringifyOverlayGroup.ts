import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class stringifyOverlayGroup1634053219263 implements MigrationInterface {
  name = 'stringifyOverlayGroup1634053219263';

  public async up(queryRunner: QueryRunner): Promise < void > {
    return;
    const mapper = await queryRunner.manager.getRepository(`overlay_mapper`).find({ where:  { value: 'group' }, select: {
      'id':    true,
      'value': true,
      'opts':  true,
    } });
    for (const group of mapper as any) {
      for (const item of group.opts.items) {
        item.opts = JSON.stringify(item.opts);
      }
      await queryRunner.manager.getRepository(`overlay_mapper`).save(group);
    }
  }

  public async down(queryRunner: QueryRunner): Promise < void > {
    return;
  }

}
