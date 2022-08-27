import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cooldown"`);
    await queryRunner.query(`DROP TABLE "cooldown"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);

    await queryRunner.query(`CREATE TABLE "cooldown" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "miliseconds" integer NOT NULL, "type" varchar(10) NOT NULL, "timestamp" varchar(30) NOT NULL, "isErrorMsgQuiet" boolean NOT NULL, "isEnabled" boolean NOT NULL, "isOwnerAffected" boolean NOT NULL, "isModeratorAffected" boolean NOT NULL, "isSubscriberAffected" boolean NOT NULL)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aa85aa267ec6eaddf7f93e3665" ON "cooldown" ("name") `);

    for (const item of items) {
      await insertItemIntoTable('cooldown', {
        ...item,
        timestamp: new Date(0).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}