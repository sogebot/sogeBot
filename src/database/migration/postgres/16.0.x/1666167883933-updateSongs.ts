import { MigrationInterface, QueryRunner } from 'typeorm';
import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class updateSongs1666167883933 implements MigrationInterface {
  name = 'updateSongs1666167883933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "song_playlist"`);

    await queryRunner.query(`DELETE from "song_playlist" WHERE 1=1`);
    await queryRunner.query(`DELETE from "song_request" WHERE 1=1`);

    await queryRunner.query(`ALTER TABLE "song_playlist" DROP COLUMN "lastPlayedAt"`);
    await queryRunner.query(`ALTER TABLE "song_playlist" ADD "lastPlayedAt" character varying(30) NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'`);
    await queryRunner.query(`ALTER TABLE "song_request" DROP COLUMN "addedAt"`);
    await queryRunner.query(`ALTER TABLE "song_request" ADD "addedAt" character varying(30) NOT NULL`);

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
