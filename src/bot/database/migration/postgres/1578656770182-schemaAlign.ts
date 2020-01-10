import {MigrationInterface, QueryRunner} from 'typeorm';

export class schemaAlign1578656770182 implements MigrationInterface {
  name = 'schemaAlign1578656770182';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "goal" ALTER COLUMN "goalAmount" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "goal" ALTER COLUMN "currentAmount" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game" ALTER COLUMN "gameplayMain" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game" ALTER COLUMN "gameplayCompletionist" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "song_playlist" ALTER COLUMN "seed" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "song_playlist" ALTER COLUMN "loudness" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" ALTER COLUMN "loudness" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "twitch_stats" ALTER COLUMN "currentTips" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "amount" TYPE double precision(12)`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "sortAmount" TYPE double precision(12)`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "sortAmount" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "amount" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "twitch_stats" ALTER COLUMN "currentTips" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" ALTER COLUMN "loudness" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "song_playlist" ALTER COLUMN "loudness" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "song_playlist" ALTER COLUMN "seed" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game" ALTER COLUMN "gameplayCompletionist" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "how_long_to_beat_game" ALTER COLUMN "gameplayMain" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "goal" ALTER COLUMN "currentAmount" TYPE double precision`, undefined);
    await queryRunner.query(`ALTER TABLE "goal" ALTER COLUMN "goalAmount" TYPE double precision`, undefined);
  }

}
