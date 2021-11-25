import { MigrationInterface, QueryRunner } from 'typeorm';

export class varcharUUID1635631125263 implements MigrationInterface {
  name = 'varcharUUID1635631125263';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0;', undefined);
    await queryRunner.query('ALTER TABLE `alert` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_follow` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_follow` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_sub` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_sub` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subgift` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subgift` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_host` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_host` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_raid` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_raid` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_tip` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_tip` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_cheer` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_cheer` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_resub` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_resub` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_command_redeem` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_command_redeem` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` MODIFY `alertId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alias` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cache_emotes` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `carousel` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `checklist` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY `commandId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_count` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_board` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` MODIFY `cooldownId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `quickaction` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `discord_link` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_operation` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_operation` MODIFY `eventId` varchar(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_list` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `gallery` MODIFY `id` varchar(36) NOT NULL', undefined);
    await queryRunner.query(`ALTER TABLE \`goal_group\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`goal\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`goal\` MODIFY \`groupId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`highlight\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`how_long_to_beat_game\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`how_long_to_beat_game_item\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`how_long_to_beat_game_item\` MODIFY \`hltb_id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword_responses\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword_responses\` MODIFY \`keywordId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`overlay_mapper\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`permissions\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`permission_filters\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`permission_filters\` MODIFY \`permissionId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`permission_commands\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll_vote\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll_vote\` MODIFY \`pollId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`price\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant\` MODIFY \`raffleId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant_message\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant_message\` MODIFY \`participantId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`randomizer\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`randomizer_item\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`randomizer_item\` MODIFY \`randomizerId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`rank\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`scrim_match_id\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`song_request\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`text\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`thread_event\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`timer\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`timer_response\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`timer_response\` MODIFY \`timerId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`twitch_tag_localization_name\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`twitch_tag_localization_description\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`variable\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`variable_history\` MODIFY \`variableId\` varchar(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`variable_url\` MODIFY \`id\` varchar(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`variable_url\` MODIFY \`variableId\` varchar(36) NULL`);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1;', undefined);

  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
