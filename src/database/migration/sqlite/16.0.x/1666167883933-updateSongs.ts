import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateSongs1666167883933 implements MigrationInterface {
  name = 'updateSongs1666167883933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "song_playlist"`);

    await queryRunner.query(`DROP TABLE "song_request"`);
    await queryRunner.query(`CREATE TABLE "song_request" ("videoId" varchar NOT NULL, "addedAt" varchar(30) NOT NULL, "title" varchar NOT NULL, "loudness" float NOT NULL, "length" integer NOT NULL, "username" varchar NOT NULL, "id" varchar PRIMARY KEY NOT NULL)`);

    await queryRunner.query(`DROP TABLE "song_playlist"`);
    await queryRunner.query(`CREATE TABLE "song_playlist" ("videoId" varchar PRIMARY KEY NOT NULL, "lastPlayedAt" varchar(30) NOT NULL DEFAULT ('1970-01-01T00:00:00.000Z'), "seed" float NOT NULL, "title" varchar NOT NULL, "loudness" float NOT NULL, "length" integer NOT NULL, "forceVolume" boolean NOT NULL DEFAULT (0), "volume" integer NOT NULL, "startTime" integer NOT NULL, "endTime" integer NOT NULL, "tags" text NOT NULL)`);

    for (const item of items) {
      item.lastPlayedAt = new Date().toISOString();
      item.seed = Math.random();

      await insertItemIntoTable('song_playlist', {
        ...item,
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
