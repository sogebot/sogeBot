import { MigrationInterface, QueryRunner } from 'typeorm';

export class PermitByUserId1583162070570 implements MigrationInterface {
  name = 'PermitByUserId1583162070570';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`, undefined);
    await queryRunner.query(`DROP TABLE "moderation_warning"`, undefined);
    await queryRunner.query(`DROP TABLE "moderation_permit"`, undefined);
    await queryRunner.query(`CREATE TABLE "moderation_warning" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`CREATE TABLE "moderation_permit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "userId" integer NOT NULL)`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("userId") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("userId") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`, undefined);
    await queryRunner.query(`DROP TABLE "moderation_warning"`, undefined);
    await queryRunner.query(`DROP TABLE "moderation_permit"`, undefined);
    await queryRunner.query(`CREATE TABLE "moderation_permit" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL)`, undefined);
    await queryRunner.query(`CREATE TABLE "moderation_warning" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("username") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("username") `, undefined);
  }

}
