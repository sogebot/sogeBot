import { MigrationInterface, QueryRunner } from 'typeorm';

export class randomizer1579516665139 implements MigrationInterface {
  name = 'randomizer1579516665139';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE TABLE `randomizer` (`id` varchar(36) NOT NULL, `widgetOrder` int NOT NULL, `createdAt` bigint NOT NULL DEFAULT 0, `command` varchar(255) NOT NULL, `isShown` tinyint NOT NULL DEFAULT 0, `type` varchar(20) NOT NULL DEFAULT \'simple\', `customizationFont` text NOT NULL, `permissionId` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, UNIQUE INDEX `idx_randomizer_cmdunique` (`command`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('CREATE TABLE `randomizer_item` (`id` varchar(36) NOT NULL, `randomizerId` varchar(255) NULL, `groupId` varchar(255) NULL, `name` varchar(255) NOT NULL, `color` varchar(9) NULL, `numOfDuplicates` int NOT NULL DEFAULT 1, `minimalSpacing` int NOT NULL DEFAULT 1, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('ALTER TABLE `randomizer_item` ADD CONSTRAINT `FK_f4505c5b831084d188f4d1aabc7` FOREIGN KEY (`randomizerId`) REFERENCES `randomizer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
    await queryRunner.query('DELETE FROM `settings` WHERE `namespace` = "/games/wheeloffortune"', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `randomizer_item` DROP FOREIGN KEY `FK_f4505c5b831084d188f4d1aabc7`', undefined);
    await queryRunner.query('DROP TABLE `randomizer_item`', undefined);
    await queryRunner.query('DROP INDEX `idx_randomizer_cmdunique` ON `randomizer`', undefined);
    await queryRunner.query('DROP TABLE `randomizer`', undefined);
  }

}
