import { MigrationInterface, QueryRunner } from 'typeorm';

export class addWidgetCustom1621776732236 implements MigrationInterface {
  name = 'addWidgetCustom1621776732236';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "widget_custom" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "url" varchar NOT NULL, "name" varchar NOT NULL)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "widget_custom"`);
  }

}
