import { MigrationInterface, QueryRunner } from 'typeorm';

export class spotifyBanList1595974777207 implements MigrationInterface {
  name = 'spotifyBanList1595974777207';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "spotify_song_ban" ("spotifyUri" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "artists" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "spotify_song_ban"`);
  }

}
