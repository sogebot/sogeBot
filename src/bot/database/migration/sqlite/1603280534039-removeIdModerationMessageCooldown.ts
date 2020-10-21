import {MigrationInterface, QueryRunner} from 'typeorm';

export class removeIdModerationMessageCooldown1603280534039 implements MigrationInterface {
  name = 'removeIdModerationMessageCooldown1603280534039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_45ad701f0c2955bc09b5661898"`);
    await queryRunner.query(`DROP TABLE "moderation_message_cooldown"`);
    await queryRunner.query(`CREATE TABLE "moderation_message_cooldown" ("name" varchar PRIMARY KEY NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "moderation_message_cooldown"`);
    await queryRunner.query(`CREATE TABLE "moderation_message_cooldown" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "timestamp" bigint NOT NULL DEFAULT (0))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45ad701f0c2955bc09b5661898" ON "moderation_message_cooldown" ("name") `);
  }

}
