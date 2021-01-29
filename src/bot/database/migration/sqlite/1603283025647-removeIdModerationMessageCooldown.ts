import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeModerationMessageCooldown1603283025647 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "moderation_message_cooldown"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "moderation_message_cooldown" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`);
  }

}
