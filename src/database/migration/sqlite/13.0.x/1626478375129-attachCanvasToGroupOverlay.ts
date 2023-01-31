import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class attachCanvasToGroupOverlay1626478375129 implements MigrationInterface {
  name = 'attachCanvasToGroupOverlay1626478375129';

  public async up(queryRunner: QueryRunner): Promise < void > {
    return;
    const mapper = await queryRunner.manager.getRepository(`overlay_mapper`).find({ where:  { value: 'group' }, select: {
      'id':    true,
      'value': true,
      'opts':  true,
    } });
    for (const item of mapper) {
      await queryRunner.manager.getRepository(`overlay_mapper`).save({
        ...(item as any),
        opts: {
          items:  (item as any).opts,
          canvas: {
            width:  1920,
            height: 1080,
          },
        },
      });
    }
  }

  public async down(queryRunner: QueryRunner): Promise < void > {
    return;
  }
}
