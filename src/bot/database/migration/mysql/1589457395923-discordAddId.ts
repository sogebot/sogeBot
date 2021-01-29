import { MigrationInterface, QueryRunner } from 'typeorm';

export class discordAddId1589457395923 implements MigrationInterface {
  name = 'discordAddId1589457395923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `discord_link`', undefined);
    await queryRunner.query('CREATE TABLE `discord_link` (`id` varchar(36) NOT NULL, `tag` varchar(255) NOT NULL, `discordId` varchar(255) NOT NULL, `createdAt` bigint NOT NULL, `userId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `discord_link`', undefined);
    await queryRunner.query('CREATE TABLE `discord_link` (`id` varchar(36) NOT NULL, `tag` varchar(255) NOT NULL, `createdAt` bigint NOT NULL, `userId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
  }

}
