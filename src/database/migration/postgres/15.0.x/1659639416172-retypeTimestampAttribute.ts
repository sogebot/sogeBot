import { MigrationInterface, QueryRunner } from 'typeorm';

import { insertItemIntoTable } from '~/database/insertItemIntoTable';

export class retypeTimestampAttribute1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttribute1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const items = await queryRunner.query(`SELECT * from "cooldown"`);
    const items2 = await queryRunner.query(`SELECT * from "cooldown_viewer"`);

    await queryRunner.query(`ALTER TABLE "cooldown_viewer" DROP CONSTRAINT "FK_5ba6ccf5a51426111e322c80445"`);
    await queryRunner.query(`ALTER TABLE "cooldown" DROP COLUMN "timestamp"`);
    await queryRunner.query(`ALTER TABLE "cooldown" ADD "timestamp" character varying(30) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" DROP COLUMN "timestamp"`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ADD "timestamp" character varying(30) NOT NULL`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" DROP COLUMN "cooldownId"`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ADD "cooldownId" character varying`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ADD CONSTRAINT "FK_5ba6ccf5a51426111e322c80445" FOREIGN KEY ("cooldownId") REFERENCES "cooldown"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

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