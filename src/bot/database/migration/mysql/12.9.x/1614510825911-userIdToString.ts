import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bets_participations\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`discord_link\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`duel\` MODIFY \`id\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`heist_user\` MODIFY \`id\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`points_changelog\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`quotes\` MODIFY \`quotedBy\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user_bit\` MODIFY \`userUserId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user_tip\` MODIFY \`userUserId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user\` MODIFY \`userUserId\` varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bets_participations\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`discord_link\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`duel\` MODIFY \`id\` int`);
    await queryRunner.query(`ALTER TABLE \`heist_user\` MODIFY \`id\` int`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`points_changelog\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`quotes\` MODIFY \`quotedBy\` int`);
    await queryRunner.query(`ALTER TABLE \`user_bit\` MODIFY \`userUserId\` int`);
    await queryRunner.query(`ALTER TABLE \`user_tip\` MODIFY \`userUserId\` int`);
    await queryRunner.query(`ALTER TABLE \`user\` MODIFY \`userUserId\` int`);
  }
}