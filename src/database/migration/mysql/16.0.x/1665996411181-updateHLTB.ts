import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateHLTB1665996411181 implements MigrationInterface {
  name = 'updateHLTB1665996411181';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from \`how_long_to_beat_game\``);
    const items2 = await queryRunner.query(`SELECT * from \`how_long_to_beat_game_item\``);

    await queryRunner.query(`DROP TABLE \`how_long_to_beat_game\``);
    await queryRunner.query(`DROP TABLE \`how_long_to_beat_game_item\``);

    await queryRunner.query(`CREATE TABLE \`how_long_to_beat_game\` (\`id\` varchar(36) NOT NULL, \`game\` varchar(255) NOT NULL, \`startedAt\` varchar(30) NOT NULL, \`updatedAt\` varchar(30) NOT NULL, \`gameplayMain\` float(12) NOT NULL DEFAULT '0', \`gameplayMainExtra\` float(12) NOT NULL DEFAULT '0', \`gameplayCompletionist\` float(12) NOT NULL DEFAULT '0', \`offset\` bigint(12) NOT NULL DEFAULT '0', \`streams\` json NOT NULL, UNIQUE INDEX \`IDX_301758e0e3108fc902d5436527\` (\`game\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    for (const item of items) {
      item.streams = JSON.stringify(items2.filter((o: any) => o.hltb_id === item.id));
      await insertItemIntoTable('how_long_to_beat_game', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
