import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeChecklistId1635599216109 implements MigrationInterface {
  name = 'changeChecklistId1635599216109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "checklist" DROP COLUMN "value"`);
    await queryRunner.query(`ALTER TABLE "checklist" DROP CONSTRAINT "PK_e4b437f5107f2a9d5b744d4eb4c"`);
    await queryRunner.query(`ALTER TABLE "checklist" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "checklist" ADD "id" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "checklist" ADD CONSTRAINT "PK_e4b437f5107f2a9d5b744d4eb4c" PRIMARY KEY ("id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "checklist" DROP CONSTRAINT "PK_e4b437f5107f2a9d5b744d4eb4c"`);
    await queryRunner.query(`ALTER TABLE "checklist" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "checklist" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
    await queryRunner.query(`ALTER TABLE "checklist" ADD CONSTRAINT "PK_e4b437f5107f2a9d5b744d4eb4c" PRIMARY KEY ("id")`);
    await queryRunner.query(`ALTER TABLE "checklist" ADD "value" character varying NOT NULL`);
  }

}
