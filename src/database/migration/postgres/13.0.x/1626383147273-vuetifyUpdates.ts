import { MigrationInterface, QueryRunner } from 'typeorm';

export class vuetifyUpdates1626383147273 implements MigrationInterface {
  name = 'vuetifyUpdates1626383147273';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "quickaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "order" integer NOT NULL, "type" character varying NOT NULL, "options" text NOT NULL, CONSTRAINT "PK_b77fe99fe6a95cf4119e6756ca5" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "widget_custom" ("id" character varying NOT NULL, "userId" character varying NOT NULL, "url" character varying NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_6e587fd12023c57ce45562ba99a" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "gallery" ADD "folder" character varying NOT NULL DEFAULT '/'`);
    await queryRunner.query(`ALTER TABLE "goal" DROP COLUMN "endAfter"`);
    await queryRunner.query(`ALTER TABLE "goal" ADD "endAfter" bigint NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "goal" DROP COLUMN "endAfter"`);
    await queryRunner.query(`ALTER TABLE "goal" ADD "endAfter" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "gallery" DROP COLUMN "folder"`);
    await queryRunner.query(`DROP TABLE "widget_custom"`);
    await queryRunner.query(`DROP TABLE "quickaction"`);
  }

}