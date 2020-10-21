import {MigrationInterface, QueryRunner} from 'typeorm';

export class removeIdModerationMessageCooldown1603280534039 implements MigrationInterface {
  name = 'removeIdModerationMessageCooldown1603280534039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_45ad701f0c2955bc09b5661898` ON `moderation_message_cooldown`');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` DROP PRIMARY KEY');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` DROP COLUMN `id`');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` ADD PRIMARY KEY (`name`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` DROP PRIMARY KEY');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` ADD `id` varchar(36) NOT NULL');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` ADD PRIMARY KEY (`id`)');
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_45ad701f0c2955bc09b5661898` ON `moderation_message_cooldown` (`name`)');
  }

}
