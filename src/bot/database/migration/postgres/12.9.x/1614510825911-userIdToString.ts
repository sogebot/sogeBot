import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bets_participations" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "discord_link" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "duel" ALTER COLUMN "id" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "heist_user" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "moderation_warning" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "moderation_permit" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "points_changelog" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "quotedBy" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user_bit" DROP CONSTRAINT "FK_cca96526faa532e7d20a0f775b0"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" DROP CONSTRAINT "FK_36683fb221201263b38344a9880"`, undefined);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user_bit" ALTER COLUMN "userUserId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "userUserId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user_tip" ADD CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
    await queryRunner.query(`ALTER TABLE "user_bit" ADD CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
    await queryRunner.query(`ALTER TABLE "dashboard" ALTER COLUMN "userId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "variable_history" ALTER COLUMN "userId" TYPE character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bets_participations" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "cooldown_viewer" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "discord_link" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "duel" ALTER COLUMN "id" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "heist_user" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "moderation_warning" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "moderation_permit" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "points_changelog" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "quotedBy" TYPE integer`);

    await queryRunner.query(`ALTER TABLE "user_bit" DROP CONSTRAINT "FK_cca96526faa532e7d20a0f775b0"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_tip" DROP CONSTRAINT "FK_36683fb221201263b38344a9880"`, undefined);
    await queryRunner.query(`ALTER TABLE "user_bit" ALTER COLUMN "userUserId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "userUserId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "userId" TYPE integer`);
    await queryRunner.query(`ALTER TABLE "user_tip" ALTER COLUMN "userUserId" TYPE character varying`);
    await queryRunner.query(`ALTER TABLE "user_tip" ADD CONSTRAINT "FK_36683fb221201263b38344a9880" FOREIGN KEY ("userUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
    await queryRunner.query(`ALTER TABLE "user_bit" ADD CONSTRAINT "FK_cca96526faa532e7d20a0f775b0" FOREIGN KEY ("userUserId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
  }
}