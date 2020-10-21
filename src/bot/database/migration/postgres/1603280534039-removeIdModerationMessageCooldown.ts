import {MigrationInterface, QueryRunner} from 'typeorm';

export class removeIdModerationMessageCooldown1603280534039 implements MigrationInterface {
  name = 'removeIdModerationMessageCooldown1603280534039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_45ad701f0c2955bc09b5661898"`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" DROP CONSTRAINT "PK_f04b88fc0a7e570198d2016180d"`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" DROP COLUMN "id"`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" ADD CONSTRAINT "PK_45ad701f0c2955bc09b5661898f" PRIMARY KEY ("name")`);  
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" DROP CONSTRAINT "PK_45ad701f0c2955bc09b5661898f"`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
    await queryRunner.query(`ALTER TABLE "moderation_message_cooldown" ADD CONSTRAINT "PK_f04b88fc0a7e570198d2016180d" PRIMARY KEY ("id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_45ad701f0c2955bc09b5661898" ON "moderation_message_cooldown" ("name") `);
  }

}
