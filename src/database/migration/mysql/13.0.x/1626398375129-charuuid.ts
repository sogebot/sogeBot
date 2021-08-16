import { MigrationInterface, QueryRunner } from 'typeorm';

export class charUUID1626398375129 implements MigrationInterface {
  name = 'charUUID1626398375129';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0;', undefined);
    await queryRunner.query('ALTER TABLE `alert` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_follow` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_sub` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subgift` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_host` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_raid` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_tip` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_cheer` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_resub` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_command_redeem` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alias` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cache_emotes` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `carousel` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `checklist` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_count` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_board` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `quickaction` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1;', undefined);

  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
