import { MigrationInterface, QueryRunner } from 'typeorm';

export class addTTSTemplate1641559036882 implements MigrationInterface {
  name = 'addTTSTemplate1641559036882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_tip" ADD "ttsTemplate" character varying NOT NULL DEFAULT '{message}'`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ADD "ttsTemplate" character varying NOT NULL DEFAULT '{message}'`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ADD "ttsTemplate" character varying NOT NULL DEFAULT '{message}'`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ADD "ttsTemplate" character varying NOT NULL DEFAULT '{message}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
