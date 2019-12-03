import {MigrationInterface, QueryRunner} from 'typeorm';

export class randomizer1575377795642 implements MigrationInterface {
  name = 'randomizer1575377795642';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE TABLE `randomizer` (`id` varchar(36) NOT NULL, `createdAt` bigint NOT NULL DEFAULT 0, `command` varchar(255) NOT NULL, `permissionId` varchar(255) NOT NULL, `name` varchar(255) NOT NULL, `isShown` tinyint NOT NULL DEFAULT 0, `type` varchar(20) NOT NULL DEFAULT \'simple\', `customizationFont` text NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('CREATE TABLE `randomizer_item` (`id` varchar(36) NOT NULL, `randomizerId` varchar(255) NULL, `name` varchar(255) NOT NULL, `randomColor` tinyint NOT NULL DEFAULT 1, `color` varchar(9) NULL, `chanceWeight` int NOT NULL DEFAULT 100, `numOfDuplicates` int NOT NULL DEFAULT 1, `minimalSpacing` int NOT NULL DEFAULT 1, INDEX `IDX_f4505c5b831084d188f4d1aabc` (`randomizerId`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
    await queryRunner.query('ALTER TABLE `randomizer_item` ADD CONSTRAINT `FK_f4505c5b831084d188f4d1aabc7` FOREIGN KEY (`randomizerId`) REFERENCES `randomizer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `randomizer_item` DROP FOREIGN KEY `FK_f4505c5b831084d188f4d1aabc7`', undefined);
    await queryRunner.query('DROP INDEX `IDX_f4505c5b831084d188f4d1aabc` ON `randomizer_item`', undefined);
    await queryRunner.query('DROP TABLE `randomizer_item`', undefined);
    await queryRunner.query('DROP TABLE `randomizer`', undefined);
  }

}
