import { MigrationInterface, QueryRunner } from 'typeorm';

export class addTTStemplate1643061611855 implements MigrationInterface {
  name = 'addTTStemplate1643061611855';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_follow" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_host" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ADD "ttsTemplate" character varying NOT NULL DEFAULT ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" DROP COLUMN "ttsTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_raid" DROP COLUMN "ttsTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_host" DROP COLUMN "ttsTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" DROP COLUMN "ttsTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" DROP COLUMN "ttsTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_sub" DROP COLUMN "ttsTemplate"`);
    await queryRunner.query(`ALTER TABLE "alert_follow" DROP COLUMN "ttsTemplate"`);
  }

}
