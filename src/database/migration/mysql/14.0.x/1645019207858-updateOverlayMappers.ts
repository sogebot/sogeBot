import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateOverlayMappers1645019207858 implements MigrationInterface {
  name = 'updateOverlayMappers1645019207858';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`temporary_overlay_mapper\` (\`id\` varchar PRIMARY KEY NOT NULL, \`value\` varchar, \`opts\` text, \`groupId\` varchar)`);
    await queryRunner.query(`INSERT INTO \`temporary_overlay_mapper\`(\`id\`, \`value\`, \`opts\`) SELECT \`id\`, \`value\`, \`opts\` FROM \`overlay_mapper\``);
    await queryRunner.query(`DROP TABLE \`overlay_mapper\``);
    await queryRunner.query(`ALTER TABLE \`temporary_overlay_mapper\` RENAME TO \`overlay_mapper\``);
    await queryRunner.query(`CREATE INDEX \`IDX_overlay_mapper_groupId\` ON \`overlay_mapper\` (\`groupId\`) `);

    // remap group
    const groups = await queryRunner.query(`SELECT * FROM \`overlay_mapper\` WHERE \`value\`="group"`);

    for (const group of groups) {
      const id = group.id;
      const opts: any = JSON.parse(group.opts);

      for (const item of opts.items) {
        const newOverlayItem = {
          id:      item.id,
          groupId: id,
          value:   item.type,
          opts:    JSON.parse(item.opts),
        };

        delete item.type;
        delete item.opts;
        delete item.__typename;
        delete item.groupId;

        await queryRunner.query(`INSERT INTO \`overlay_mapper\`(\`id\`, \`groupId\`, \`value\`, \`opts\`) VALUES(?, ?, ?, ?)`,
          [newOverlayItem.id, newOverlayItem.groupId, newOverlayItem.value, newOverlayItem.opts ? JSON.stringify(newOverlayItem.opts) : null]);

      }
      await queryRunner.query(`UPDATE \`overlay_mapper\` SET \`opts\`=? WHERE \`id\`=?`,
        [opts ? JSON.stringify(opts) : null, group.id]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
