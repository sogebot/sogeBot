import { MigrationInterface, QueryRunner } from 'typeorm';

export class pollIsOpenedIdx1602070380846 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_poll_isOpened` ON `poll` (`isOpened`)');
    await queryRunner.query('ALTER TABLE `poll` MODIFY `type` varchar(7) NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_poll_isOpened` ON `poll`');
    await queryRunner.query('ALTER TABLE `poll` MODIFY `type` varchar(7) NOT NULL');
  }

}
