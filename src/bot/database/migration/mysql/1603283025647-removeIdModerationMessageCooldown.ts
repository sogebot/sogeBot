import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeModerationMessageCooldown1603283025647 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `moderation_message_cooldown`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `moderation_message_cooldown` (`id` int NOT NULL AUTO_INCREMENT, `name` varchar(255) NOT NULL, `timestamp` bigint NOT NULL DEFAULT 0, UNIQUE INDEX `IDX_45ad701f0c2955bc09b5661898` (`name`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` CHANGE `id` `id` int NOT NULL');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` DROP PRIMARY KEY');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` DROP COLUMN `id`');
    await queryRunner.query('ALTER TABLE `moderation_message_cooldown` ADD `id` varchar(36) NOT NULL PRIMARY KEY');
  }

}
