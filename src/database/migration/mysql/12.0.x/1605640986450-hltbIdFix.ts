import { MigrationInterface, QueryRunner } from 'typeorm';

export class hltbIdFix1605640986450 implements MigrationInterface {
  name = 'hltbIdFix1605640986450';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `how_long_to_beat_game_item` CHANGE `hltb_id` `hltb_id` varchar(255) NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `how_long_to_beat_game_item` CHANGE `hltb_id` `hltb_id` int NOT NULL');
  }

}
