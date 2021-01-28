import { MigrationInterface, QueryRunner } from 'typeorm';

export class pointsChangelog1587985735225 implements MigrationInterface {
  name = 'pointsChangelog1587985735225';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `points_changelog` (`id` int NOT NULL AUTO_INCREMENT, `userId` int NOT NULL, `originalValue` int NOT NULL, `updatedValue` int NOT NULL, `updatedAt` bigint NOT NULL, `command` varchar(255) NOT NULL, INDEX `IDX_points_changelog_userId` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_points_changelog_userId` ON `points_changelog`', undefined);
    await queryRunner.query('DROP TABLE `points_changelog`', undefined);
  }

}
