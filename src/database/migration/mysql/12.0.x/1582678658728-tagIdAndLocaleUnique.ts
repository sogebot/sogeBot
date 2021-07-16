import { MigrationInterface, QueryRunner } from 'typeorm';

export class tagIdAndLocaleUnique1582678658728 implements MigrationInterface {
  name = 'tagIdAndLocaleUnique1582678658728';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` DROP FOREIGN KEY `FK_4d8108fc3e8dcbe5c112f53dd3f`', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_name` DROP FOREIGN KEY `FK_dcf417a56c907f3a6788476047b`', undefined);
    await queryRunner.query('DROP INDEX `IDX_dcf417a56c907f3a6788476047` ON `twitch_tag_localization_name`', undefined);
    await queryRunner.query('DROP INDEX `IDX_4d8108fc3e8dcbe5c112f53dd3` ON `twitch_tag_localization_description`', undefined);
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_dcf417a56c907f3a6788476047` ON `twitch_tag_localization_name` (`tagId`, `locale`)', undefined);
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_4d8108fc3e8dcbe5c112f53dd3` ON `twitch_tag_localization_description` (`tagId`, `locale`)', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_name` ADD CONSTRAINT `FK_dcf417a56c907f3a6788476047b` FOREIGN KEY (`tagId`) REFERENCES `twitch_tag`(`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` ADD CONSTRAINT `FK_4d8108fc3e8dcbe5c112f53dd3f` FOREIGN KEY (`tagId`) REFERENCES `twitch_tag`(`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` DROP FOREIGN KEY `FK_4d8108fc3e8dcbe5c112f53dd3f`', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_name` DROP FOREIGN KEY `FK_dcf417a56c907f3a6788476047b`', undefined);
    await queryRunner.query('DROP INDEX `IDX_4d8108fc3e8dcbe5c112f53dd3` ON `twitch_tag_localization_description`', undefined);
    await queryRunner.query('DROP INDEX `IDX_dcf417a56c907f3a6788476047` ON `twitch_tag_localization_name`', undefined);
    await queryRunner.query('CREATE INDEX `IDX_4d8108fc3e8dcbe5c112f53dd3` ON `twitch_tag_localization_description` (`tagId`)', undefined);
    await queryRunner.query('CREATE INDEX `IDX_dcf417a56c907f3a6788476047` ON `twitch_tag_localization_name` (`tagId`)', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_name` ADD CONSTRAINT `FK_dcf417a56c907f3a6788476047b` FOREIGN KEY (`tagId`) REFERENCES `twitch_tag`(`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
    await queryRunner.query('ALTER TABLE `twitch_tag_localization_description` ADD CONSTRAINT `FK_4d8108fc3e8dcbe5c112f53dd3f` FOREIGN KEY (`tagId`) REFERENCES `twitch_tag`(`tag_id`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
  }

}
