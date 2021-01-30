import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeModerationMessageCooldown1603283025647 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "moderation_message_cooldown"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "moderation_message_cooldown" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "timestamp" bigint NOT NULL DEFAULT 0, CONSTRAINT "PK_f04b88fc0a7e570198d2016180d" PRIMARY KEY ("id"))`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45ad701f0c2955bc09b5661898" ON "moderation_message_cooldown" ("name") `, undefined);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" DROP CONSTRAINT "PK_f04b88fc0a7e570198d2016180d"`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" ADD CONSTRAINT "PK_f04b88fc0a7e570198d2016180d" PRIMARY KEY ("id")`);
  }

}
