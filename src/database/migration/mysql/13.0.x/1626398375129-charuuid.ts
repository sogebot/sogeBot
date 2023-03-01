import { MigrationInterface, QueryRunner } from 'typeorm';

export class charUUID1626398375129 implements MigrationInterface {
  name = 'charUUID1626398375129';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=0;', undefined);
    await queryRunner.query('ALTER TABLE `alert` MODIFY `id` char(36) NOT NULL', undefined);
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
    await queryRunner.query(`ALTER TABLE \`goal_group\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`goal\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`goal\` MODIFY \`groupId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`highlight\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`how_long_to_beat_game\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`how_long_to_beat_game_item\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`how_long_to_beat_game_item\` MODIFY \`hltb_id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword_responses\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`keyword_responses\` MODIFY \`keywordId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`overlay_mapper\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`permissions\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`permission_filters\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`permission_filters\` MODIFY \`permissionId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`permission_commands\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll_vote\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`poll_vote\` MODIFY \`pollId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`price\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant\` MODIFY \`raffleId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant_message\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant_message\` MODIFY \`participantId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`randomizer\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`randomizer_item\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`randomizer_item\` MODIFY \`randomizerId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`rank\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`scrim_match_id\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`song_request\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`text\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`thread_event\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`timer\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`timer_response\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`timer_response\` MODIFY \`timerId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`twitch_tag_localization_name\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`twitch_tag_localization_description\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`variable\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`variable_history\` MODIFY \`variableId\` char(36) NULL`);
    await queryRunner.query(`ALTER TABLE \`variable_url\` MODIFY \`id\` char(36) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`variable_url\` MODIFY \`variableId\` char(36) NULL`);
    await queryRunner.query('SET FOREIGN_KEY_CHECKS=1;', undefined);

  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
