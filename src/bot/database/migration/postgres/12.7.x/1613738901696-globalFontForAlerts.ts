import { MigrationInterface, QueryRunner } from 'typeorm';

export class globalFontForAlerts1613738901696 implements MigrationInterface {
  name = 'globalFontForAlerts16137389016965';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert" ADD "font" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert" ADD "fontMessage" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_follow" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_follow"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_sub"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_subcommunitygift"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_subgift"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_host" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_host"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_raid"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_tip" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_tip"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_cheer"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_resub"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_command_redeem"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ALTER COLUMN "font" DROP NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_reward_redeem"."font" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`COMMENT ON COLUMN "alert_reward_redeem"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_command_redeem"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_resub"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_cheer"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_tip"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_tip" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_raid"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_host"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_host" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_subgift"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_subcommunitygift"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_sub"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`COMMENT ON COLUMN "alert_follow"."font" IS NULL`);
    await queryRunner.query(`ALTER TABLE "alert_follow" ALTER COLUMN "font" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "fontMessage"`);
    await queryRunner.query(`ALTER TABLE "alert" DROP COLUMN "font"`);

  }  
}
