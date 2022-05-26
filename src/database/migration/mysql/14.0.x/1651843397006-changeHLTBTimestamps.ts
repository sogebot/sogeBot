import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class changeHLTBTimestamps1651843397006 implements MigrationInterface {
  name = 'changeHLTBTimestamps1651843397006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const games = await queryRunner.query(`SELECT * from \`how_long_to_beat_game\``);
    const items = await queryRunner.query(`SELECT * from \`how_long_to_beat_game_item\``);

    await queryRunner.query(`DROP TABLE \`how_long_to_beat_game\``);
    await queryRunner.query(`DROP TABLE \`how_long_to_beat_game_item\``);

    await queryRunner.query(`CREATE TABLE \`how_long_to_beat_game\` (\`id\` varchar(36) NOT NULL, \`game\` varchar(255) NOT NULL, \`startedAt\` varchar(255) NOT NULL, \`updatedAt\` varchar(255) NOT NULL, \`offset\` bigint NOT NULL DEFAULT '0', \`gameplayMain\` float(12) NOT NULL DEFAULT '0', \`gameplayMainExtra\` float(12) NOT NULL DEFAULT '0', \`gameplayCompletionist\` float(12) NOT NULL DEFAULT '0', UNIQUE INDEX \`IDX_301758e0e3108fc902d5436527\` (\`game\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`how_long_to_beat_game_item\` (\`id\` varchar(36) NOT NULL, \`hltb_id\` varchar(255) NOT NULL, \`createdAt\` varchar(255) NOT NULL, \`timestamp\` bigint NOT NULL DEFAULT '0', \`offset\` bigint NOT NULL DEFAULT '0', \`isMainCounted\` tinyint NOT NULL DEFAULT 0, \`isCompletionistCounted\` tinyint NOT NULL DEFAULT 0, \`isExtraCounted\` tinyint NOT NULL DEFAULT 0, INDEX \`IDX_hltb_id\` (\`hltb_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);

    for (const item of games) {
      delete item.imageUrl;

      item.startedAt = new Date(item.startedAt).toISOString();
      item.updatedAt = new Date().toISOString();

      await insertItemIntoTable('how_long_to_beat_game', item, queryRunner);
    }

    for (const item of items) {
      item.createdAt = new Date(item.createdAt).toISOString();
      await insertItemIntoTable('how_long_to_beat_game_item', item, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }
}
