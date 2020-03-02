import {MigrationInterface, QueryRunner} from 'typeorm';

export class PermitByUserId1583162215893 implements MigrationInterface {
  name = 'PermitByUserId1583162215893';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_warning" RENAME COLUMN "username" TO "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_permit" RENAME COLUMN "username" TO "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_warning" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_warning" ADD "userId" integer NOT NULL`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_permit" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_permit" ADD "userId" integer NOT NULL`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("userId") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("userId") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_69499e78c9ee1602baee77b97d"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_f941603aef2741795a9108d0d2"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_permit" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_permit" ADD "userId" character varying NOT NULL`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_warning" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_warning" ADD "userId" character varying NOT NULL`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_permit" RENAME COLUMN "userId" TO "username"`, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_warning" RENAME COLUMN "userId" TO "username"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_69499e78c9ee1602baee77b97d" ON "moderation_permit" ("username") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_f941603aef2741795a9108d0d2" ON "moderation_warning" ("username") `, undefined);
  }

}
