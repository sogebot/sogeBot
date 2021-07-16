import { MigrationInterface, QueryRunner } from 'typeorm';

export class hltbRefactor1602499070262 implements MigrationInterface {
  name = 'hltbRefactor1602499070262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`how_long_to_beat_game\``, undefined);
    await queryRunner.query('CREATE TABLE `how_long_to_beat_game` (`id` varchar(36) NOT NULL, `game` varchar(255) NOT NULL, `imageUrl` varchar(255) NOT NULL, `startedAt` bigint NOT NULL, `gameplayMain` float(12) NOT NULL DEFAULT 0, `gameplayCompletionist` float(12) NOT NULL DEFAULT 0, UNIQUE INDEX `IDX_301758e0e3108fc902d5436527` (`game`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('CREATE TABLE `how_long_to_beat_game_item` (`id` varchar(36) NOT NULL, `hltb_id` int NOT NULL, `createdAt` bigint NOT NULL, `timestamp` bigint NOT NULL DEFAULT 0, `offset` bigint NOT NULL DEFAULT 0, `isMainCounted` tinyint NOT NULL DEFAULT 0, `isCompletionistCounted` tinyint NOT NULL DEFAULT 0, INDEX `IDX_hltb_id` (`hltb_id`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `how_long_to_beat_game` ADD `gameplayMainExtra` float(12) NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE `how_long_to_beat_game_item` ADD `isExtraCounted` tinyint NOT NULL DEFAULT 0');
    await queryRunner.query('ALTER TABLE `how_long_to_beat_game` ADD `offset` bigint NOT NULL DEFAULT 0');

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_hltb_id` ON `how_long_to_beat_game_item`');
    await queryRunner.query('DROP TABLE `how_long_to_beat_game_item`');
    await queryRunner.query('DROP INDEX `IDX_301758e0e3108fc902d5436527` ON `how_long_to_beat_game`');
    await queryRunner.query('DROP TABLE `how_long_to_beat_game`');
    await queryRunner.query('CREATE TABLE `how_long_to_beat_game` (`id` int NOT NULL AUTO_INCREMENT, `game` varchar(255) NOT NULL, `startedAt` bigint NOT NULL DEFAULT 0, `isFinishedMain` tinyint NOT NULL, `isFinishedCompletionist` tinyint NOT NULL, `timeToBeatMain` bigint NOT NULL DEFAULT 0, `timeToBeatCompletionist` bigint NOT NULL DEFAULT 0, `gameplayMain` float NOT NULL DEFAULT 0, `gameplayCompletionist` float NOT NULL DEFAULT 0, `imageUrl` varchar(255) NOT NULL, UNIQUE INDEX `IDX_301758e0e3108fc902d5436527` (`game`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
  }

}
