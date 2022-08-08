import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cooldown"`);
    const items2 = await queryRunner.query(`SELECT * from "cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "cooldown"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);

    await queryRunner.query(`CREATE TABLE "cooldown" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "miliseconds" integer NOT NULL, "type" varchar(10) NOT NULL, "timestamp" varchar(30) NOT NULL, "isErrorMsgQuiet" boolean NOT NULL, "isEnabled" boolean NOT NULL, "isOwnerAffected" boolean NOT NULL, "isModeratorAffected" boolean NOT NULL, "isSubscriberAffected" boolean NOT NULL)`);
    await queryRunner.query(`CREATE TABLE "cooldown_viewer" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "timestamp" varchar(30) NOT NULL, "cooldownId" varchar, CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aa85aa267ec6eaddf7f93e3665" ON "cooldown" ("name") `);

    for (const item of items) {
      await insertItemIntoTable('cooldown', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }

    for (const item of items2) {
      await insertItemIntoTable('cooldown_viewer', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}