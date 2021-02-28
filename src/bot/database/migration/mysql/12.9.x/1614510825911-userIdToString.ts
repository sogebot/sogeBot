import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bets_participations\` ALTER COLUMN \`userId\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` ALTER COLUMN \`userId\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`discord_link\` ALTER COLUMN \`userId\` TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`duel\` ALTER COLUMN \`id\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`heist_user\` ALTER COLUMN \`id\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` ALTER COLUMN \`userId\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` ALTER COLUMN \`userId\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`points_changelog\` ALTER COLUMN \`userId\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`quotes\` ALTER COLUMN \`quotedBy\` TYPE varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`user_bit\` ALTER COLUMN \`userUserId\` TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user_tip\` ALTER COLUMN \`userUserId\` TYPE varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user\` ALTER COLUMN \`userUserId\` TYPE varchar(255) NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bets_participations\` ALTER COLUMN \`userId\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` ALTER COLUMN \`userId\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`discord_link\` ALTER COLUMN \`userId\` TYPE int`);
    await queryRunner.query(`ALTER TABLE \`duel\` ALTER COLUMN \`id\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`heist_user\` ALTER COLUMN \`id\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` ALTER COLUMN \`userId\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` ALTER COLUMN \`userId\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`points_changelog\` ALTER COLUMN \`userId\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`quotes\` ALTER COLUMN \`quotedBy\` TYPE int NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`user_bit\` ALTER COLUMN \`userUserId\` TYPE int`);
    await queryRunner.query(`ALTER TABLE \`user_tip\` ALTER COLUMN \`userUserId\` TYPE int`);
    await queryRunner.query(`ALTER TABLE \`user\` ALTER COLUMN \`userUserId\` TYPE int NOT NULL`);
  }
}