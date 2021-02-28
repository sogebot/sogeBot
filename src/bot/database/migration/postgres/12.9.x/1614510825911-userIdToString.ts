import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bets_participations" ALTER COLUMN "userId" TYPE character varying ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ALTER COLUMN "userId" TYPE character varying ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "discord_link" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "duel" ALTER COLUMN "id" TYPE character varying ALTER COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "heist_user" ALTER COLUMN "id" TYPE character varying ALTER COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "moderation_warning" ALTER COLUMN "userId" TYPE character varying ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "moderation_permit" ALTER COLUMN "userId" TYPE character varying ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "points_changelog" ALTER COLUMN "userId" TYPE character varying ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "quotedBy" TYPE character varying ALTER COLUMN "quotedBy"`);
    await queryRunner.query(`ALTER TABLE "user_bit" ALTER COLUMN "userUserId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "userUserId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "userUserId" TYPE character varying ALTER COLUMN "userUserId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bets_participations" ALTER COLUMN "userId" TYPE integer ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ALTER COLUMN "userId" TYPE integer ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "discord_link" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "duel" ALTER COLUMN "id" TYPE integer ALTER COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "heist_user" ALTER COLUMN "id" TYPE integer ALTER COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "moderation_warning" ALTER COLUMN "userId" TYPE integer ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "moderation_permit" ALTER COLUMN "userId" TYPE integer ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "points_changelog" ALTER COLUMN "userId" TYPE integer ALTER COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "quotedBy" TYPE integer ALTER COLUMN "quotedBy"`);
    await queryRunner.query(`ALTER TABLE "user_bit" ALTER COLUMN "userUserId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "userUserId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "userUserId" TYPE integer ALTER COLUMN "userUserId"`);
  }
}