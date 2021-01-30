import { MigrationInterface, QueryRunner } from 'typeorm';

export class discordLink1588237013092 implements MigrationInterface {
  name = 'discordLink1588237013092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `discord_link`', undefined);
    await queryRunner.query('CREATE TABLE `discord_link` (`id` varchar(36) NOT NULL, `tag` varchar(255) NOT NULL, `createdAt` bigint NOT NULL, `userId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `discord_link`', undefined);
  }

}
