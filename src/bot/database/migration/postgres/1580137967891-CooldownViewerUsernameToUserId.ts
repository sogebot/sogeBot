import { MigrationInterface, QueryRunner } from 'typeorm';

export class CooldownViewerUsernameToUserId1580137967891 implements MigrationInterface {
  name = 'CooldownViewerUsernameToUserId1580137967891';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`TRUNCATE TABLE "cooldown_viewer"`, undefined);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" RENAME COLUMN "username" TO "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ADD "userId" integer NOT NULL`, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`TRUNCATE TABLE "cooldown_viewer"`, undefined);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" DROP COLUMN "userId"`, undefined);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ADD "userId" character varying NOT NULL`, undefined);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" RENAME COLUMN "userId" TO "username"`, undefined);
  }

}
