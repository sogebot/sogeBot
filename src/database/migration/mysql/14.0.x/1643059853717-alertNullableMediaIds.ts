import { MigrationInterface, QueryRunner } from 'typeorm';

export class alertNullableMediaIds1643059853717 implements MigrationInterface {
  name = 'alertNullableMediaIds1643059853717';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`alert_follow\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_follow\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_sub\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_sub\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subcommunitygift\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subcommunitygift\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subgift\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subgift\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_host\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_host\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_raid\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_raid\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_tip\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_tip\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_cheer\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_cheer\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_resub\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_resub\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_command_redeem\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_command_redeem\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_reward_redeem\` CHANGE \`imageId\` \`imageId\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_reward_redeem\` CHANGE \`soundId\` \`soundId\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`alert_reward_redeem\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_reward_redeem\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_command_redeem\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_command_redeem\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_resub\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_resub\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_cheer\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_cheer\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_tip\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_tip\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_raid\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_raid\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_host\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_host\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subgift\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subgift\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subcommunitygift\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_subcommunitygift\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_sub\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_sub\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_follow\` CHANGE \`soundId\` \`soundId\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`alert_follow\` CHANGE \`imageId\` \`imageId\` varchar(255) NOT NULL`);
  }

}
