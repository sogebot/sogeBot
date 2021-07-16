import { MigrationInterface, QueryRunner } from 'typeorm';

export class overlayMapper1604326861945 implements MigrationInterface {
  name = 'overlayMapper1604326861945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "overlay_mapper" ("id" varchar PRIMARY KEY NOT NULL, "value" varchar)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "overlay_mapper"`);
  }

}
