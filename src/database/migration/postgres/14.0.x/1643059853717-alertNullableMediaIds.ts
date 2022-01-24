import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertNullableMediaIds1643059853717 implements MigrationInterface {
  name = 'alertNullableMediaIds1643059853717';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_follow" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_follow" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_host" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_host" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_tip" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_tip" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ALTER COLUMN "soundId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ALTER COLUMN "imageId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ALTER COLUMN "soundId" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_reward_redeem" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_command_redeem" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_resub" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_cheer" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_tip" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_tip" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_raid" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_host" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_host" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subgift" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_subcommunitygift" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_sub" ALTER COLUMN "imageId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_follow" ALTER COLUMN "soundId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "alert_follow" ALTER COLUMN "imageId" SET NOT NULL`);
  }

}
