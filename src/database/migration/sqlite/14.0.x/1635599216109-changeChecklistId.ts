import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeChecklistId1635599216109 implements MigrationInterface {
  name = 'changeChecklistId1635599216109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "temporary_checklist" ("id" varchar PRIMARY KEY NOT NULL, "isCompleted" boolean NOT NULL)`);
    await queryRunner.query(`INSERT INTO "temporary_checklist"("id", "isCompleted") SELECT "id", "isCompleted" FROM "checklist"`);
    await queryRunner.query(`DROP TABLE "checklist"`);
    await queryRunner.query(`ALTER TABLE "temporary_checklist" RENAME TO "checklist"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "checklist" RENAME TO "temporary_checklist"`);
    await queryRunner.query(`CREATE TABLE "checklist" ("id" varchar PRIMARY KEY NOT NULL, "isCompleted" boolean NOT NULL, "value" varchar NOT NULL)`);
    await queryRunner.query(`INSERT INTO "checklist"("id", "isCompleted") SELECT "id", "isCompleted" FROM "temporary_checklist"`);
    await queryRunner.query(`DROP TABLE "temporary_checklist"`);
  }

}
