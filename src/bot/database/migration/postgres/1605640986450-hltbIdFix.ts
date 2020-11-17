import {MigrationInterface, QueryRunner} from 'typeorm';

export class hltbIdFix1605640986450 implements MigrationInterface {
  name = 'hltbIdFix1605640986450';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" ALTER COLUMN "hltb_id" TYPE uuid`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_hltb_id"`);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game_item" ALTER COLUMN "hltb_id" TYPE integer`);
    await queryRunner.query(`CREATE INDEX "IDX_hltb_id" ON "how_long_to_beat_game_item" ("hltb_id") `);
  }

}
