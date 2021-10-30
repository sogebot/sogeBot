import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeChecklistId1635599216109 implements MigrationInterface {
  name = 'changeChecklistId1635599216109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "checklist"`);
    await queryRunner.query(`CREATE TABLE "checklist" ("id" varchar PRIMARY KEY NOT NULL, "isCompleted" boolean NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "checklist"`);
    await queryRunner.query(`CREATE TABLE "checklist" ("id" varchar PRIMARY KEY NOT NULL, "isCompleted" boolean NOT NULL, "value" varchar NOT NULL)`);
  }

}
