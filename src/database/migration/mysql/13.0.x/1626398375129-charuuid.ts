import { MigrationInterface, QueryRunner } from 'typeorm';

export class charUUID1626398375129 implements MigrationInterface {
  name = 'charUUID1626398375129';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0;', undefined);
    await queryRunner.query('ALTER TABLE `alert` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_follow` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_follow` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_sub` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_sub` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subcommunitygift` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subgift` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_subgift` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_host` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_host` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_raid` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_raid` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_tip` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_tip` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_cheer` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_cheer` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_resub` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_resub` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_command_redeem` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_command_redeem` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `alert_reward_redeem` MODIFY `alertId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `alias` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cache_emotes` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `carousel` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `checklist` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_responses` MODIFY `commandId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_count` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `commands_board` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `cooldown_viewer` MODIFY `cooldownId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `quickaction` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `discord_link` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_operation` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_operation` MODIFY `eventId` char(36) NULL', undefined);
    await queryRunner.query('ALTER TABLE `event_list` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query('ALTER TABLE `gallery` MODIFY `id` char(36) NOT NULL', undefined);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`goal_group\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`goal\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`goal\` MODIFY \`groupId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`highlight\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`how_long_to_beat_game\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`how_long_to_beat_game_item\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`how_long_to_beat_game_item\` MODIFY \`hltb_id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`keyword\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`keyword_responses\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`keyword_responses\` MODIFY \`keywordId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`moderation_warning\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`moderation_permit\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`overlay_mapper\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`permissions\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`permission_filters\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`permission_filters\` MODIFY \`permissionId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`permission_commands\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`poll\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`poll_vote\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`poll_vote\` MODIFY \`pollId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`price\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`raffle\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`raffle_participant\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`raffle_participant\` MODIFY \`raffleId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`raffle_participant_message\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`raffle_participant_message\` MODIFY \`participantId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`randomizer\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`randomizer_item\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`randomizer_item\` MODIFY \`randomizerId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`rank\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`scrim_match_id\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`song_request\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`text\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`thread_event\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`timer\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`timer_response\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`timer_response\` MODIFY \`timerId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`twitch_tag_localization_name\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`twitch_tag_localization_description\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`variable\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`variable_history\` MODIFY \`variableId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`variable_url\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`sogebot\`.\`variable_url\` MODIFY \`variableId\` char(36) NULL`);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1;', undefined);

  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
