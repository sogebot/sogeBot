import { MigrationInterface, QueryRunner } from 'typeorm';

export class hltbIdFix1605640986450 implements MigrationInterface {
  name = 'hltbIdFix1605640986450';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" ALTER COLUMN "hltb_id" TYPE UUID USING (uuid_generate_v4())`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" ALTER COLUMN "hltb_id" TYPE integer`);
  }

}
