import { MigrationInterface, QueryRunner } from 'typeorm';

export class cooldownRemoveLastTimestamp1590334525683 implements MigrationInterface {
  name = 'cooldownRemoveLastTimestamp1590334525683';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cooldown" DROP COLUMN "lastTimestamp"`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" DROP COLUMN "lastTimestamp"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ADD "lastTimestamp" bigint NOT NULL`);
    await queryRunner.query(`ALTER TABLE "cooldown" ADD "lastTimestamp" bigint NOT NULL DEFAULT 0`);
  }
}
