import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cooldown"`);
    await queryRunner.query(`DROP TABLE "cooldown_viewer"`);
    await queryRunner.query(`DROP TABLE "cooldown"`);

    await queryRunner.query(`CREATE TABLE "cooldown" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "miliseconds" integer NOT NULL, "type" character varying(10) NOT NULL, "timestamp" character varying(30) NOT NULL, "isEnabled" boolean NOT NULL, "isErrorMsgQuiet" boolean NOT NULL, "isOwnerAffected" boolean NOT NULL, "isModeratorAffected" boolean NOT NULL, "isSubscriberAffected" boolean NOT NULL, CONSTRAINT "PK_0f01954311dda5b3d353603c7c5" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_aa85aa267ec6eaddf7f93e3665" ON "cooldown" ("name") `);

    for (const item of items) {
      await insertItemIntoTable('cooldown', {
        ...item,
        timestamp: new Date(item.timestamp).toISOString(),
      }, queryRunner);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}