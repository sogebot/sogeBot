import { MigrationInterface, QueryRunner } from 'typeorm';

export class spotifyBanList1596014156038 implements MigrationInterface {
  name = 'spotifyBanList1596014156038';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "spotify_song_ban" ("spotifyUri" character varying NOT NULL, "title" character varying NOT NULL, "artists" text NOT NULL, CONSTRAINT "PK_f9ba62ed678a1e426db17acc387" PRIMARY KEY ("spotifyUri"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "spotify_song_ban"`);
  }

}
