import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateRandomizer1666167883938 implements MigrationInterface {
  name = 'updateRandomizer1666167883938';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`randomizer\``);
    const items2 = await queryRunner.query(`SELECT * from \`randomizer_item\``);

    await queryRunner.query(`DROP TABLE \`randomizer_item\``);
    await queryRunner.query(`DROP TABLE \`randomizer\``);
    await queryRunner.query(`CREATE TABLE \`randomizer\` (\`id\` varchar(36) NOT NULL, \`items\` json NOT NULL, \`createdAt\` varchar(30) NOT NULL, \`command\` varchar(255) NOT NULL, \`permissionId\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`isShown\` tinyint NOT NULL DEFAULT 0, \`shouldPlayTick\` tinyint NOT NULL, \`tickVolume\` int NOT NULL, \`widgetOrder\` int NOT NULL, \`type\` varchar(20) NOT NULL DEFAULT 'simple', \`position\` json NOT NULL, \`customizationFont\` json NOT NULL, \`tts\` json NOT NULL, UNIQUE INDEX \`idx_randomizer_cmdunique\` (\`command\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    for (const item of items) {
      await insertItemIntoTable('randomizer', {
        ...item,
        createdAt: new Date(item.createdAt).toISOString(),
        items:     JSON.stringify(items2.filter((o: any) => o.randomizerId === item.id)),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
