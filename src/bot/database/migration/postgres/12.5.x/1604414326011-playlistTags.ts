import { MigrationInterface, QueryRunner } from 'typeorm';

export class playlistTags1604414326011 implements MigrationInterface {
  name = 'playlistTags1604414326011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const playlist = await queryRunner.query(`SELECT * from "song_playlist"`);
    await queryRunner.query(`DROP TABLE "song_playlist"`);
    await queryRunner.query(`CREATE TABLE "song_playlist" ("videoId" character varying NOT NULL, "lastPlayedAt" bigint NOT NULL DEFAULT 0, "seed" double precision NOT NULL, "title" character varying NOT NULL, "loudness" double precision NOT NULL, "length" integer NOT NULL, "forceVolume" boolean NOT NULL DEFAULT false, "volume" integer NOT NULL, "startTime" integer NOT NULL, "endTime" integer NOT NULL, "tags" text NOT NULL, CONSTRAINT "PK_47041c19b2a8a264b51a592c9d0" PRIMARY KEY ("videoId"))`, undefined);
    for (const item of playlist) {
      await queryRunner.query(
        `INSERT INTO "song_playlist"("videoId", "lastPlayedAt", "seed", "title", "length", "loudness", "forceVolume", "volume", "startTime", "endTime", "tags") values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.videoId, item.lastPlayedAt, item.seed, item.title, item.length, item.loudness, item.forceVolume, item.volume, item.startTime, item.endTime, 'general'],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "song_playlist" DROP COLUMN "tags"`);
  }

}
