import { MigrationInterface, QueryRunner } from 'typeorm';

export class multipleSongRequestWithSameVideoId1573997722003 implements MigrationInterface {
  name = 'multipleSongRequestWithSameVideoId1573997722003';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`CREATE TABLE "temporary_song_request" ("videoId" varchar NOT NULL, "addedAt" bigint NOT NULL DEFAULT (0), "title" varchar NOT NULL, "loudness" float NOT NULL, "length" integer NOT NULL, "username" varchar NOT NULL, "id" varchar NOT NULL, PRIMARY KEY ("videoId", "id"))`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_song_request"("videoId", "addedAt", "title", "loudness", "length", "username") SELECT "videoId", "addedAt", "title", "loudness", "length", "username" FROM "song_request"`, undefined);
    await queryRunner.query(`DROP TABLE "song_request"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_song_request" RENAME TO "song_request"`, undefined);
    await queryRunner.query(`CREATE TABLE "temporary_song_request" ("videoId" varchar NOT NULL, "addedAt" bigint NOT NULL DEFAULT (0), "title" varchar NOT NULL, "loudness" float NOT NULL, "length" integer NOT NULL, "username" varchar NOT NULL, "id" varchar PRIMARY KEY NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "temporary_song_request"("videoId", "addedAt", "title", "loudness", "length", "username", "id") SELECT "videoId", "addedAt", "title", "loudness", "length", "username", "id" FROM "song_request"`, undefined);
    await queryRunner.query(`DROP TABLE "song_request"`, undefined);
    await queryRunner.query(`ALTER TABLE "temporary_song_request" RENAME TO "song_request"`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`ALTER TABLE "song_request" RENAME TO "temporary_song_request"`, undefined);
    await queryRunner.query(`CREATE TABLE "song_request" ("videoId" varchar NOT NULL, "addedAt" bigint NOT NULL DEFAULT (0), "title" varchar NOT NULL, "loudness" float NOT NULL, "length" integer NOT NULL, "username" varchar NOT NULL, "id" varchar NOT NULL, PRIMARY KEY ("videoId", "id"))`, undefined);
    await queryRunner.query(`INSERT INTO "song_request"("videoId", "addedAt", "title", "loudness", "length", "username", "id") SELECT "videoId", "addedAt", "title", "loudness", "length", "username", "id" FROM "temporary_song_request"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_song_request"`, undefined);
    await queryRunner.query(`ALTER TABLE "song_request" RENAME TO "temporary_song_request"`, undefined);
    await queryRunner.query(`CREATE TABLE "song_request" ("videoId" varchar PRIMARY KEY NOT NULL, "addedAt" bigint NOT NULL DEFAULT (0), "title" varchar NOT NULL, "loudness" float NOT NULL, "length" integer NOT NULL, "username" varchar NOT NULL)`, undefined);
    await queryRunner.query(`INSERT INTO "song_request"("videoId", "addedAt", "title", "loudness", "length", "username") SELECT "videoId", "addedAt", "title", "loudness", "length", "username" FROM "temporary_song_request"`, undefined);
    await queryRunner.query(`DROP TABLE "temporary_song_request"`, undefined);
  }

}
