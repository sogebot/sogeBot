import { MigrationInterface, QueryRunner } from 'typeorm';

export class addQuickActions1621029097170 implements MigrationInterface {
  name = 'addQuickActions1621029097170';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "dashboard"`);
    await queryRunner.query(`DROP TABLE "widget"`);
    await queryRunner.query(`CREATE TABLE "quickaction" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "order" integer NOT NULL, "type" varchar NOT NULL, "options" text NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "quickaction"`);
  }

}
