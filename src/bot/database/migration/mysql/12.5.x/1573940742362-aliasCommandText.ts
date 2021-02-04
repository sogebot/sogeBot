import { MigrationInterface, QueryRunner } from 'typeorm';

export class aliasCommandText1573940742362 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP INDEX `IDX_ed5fcb69444dcb0abf0a71053b` ON `alias`', undefined);
    await queryRunner.query('ALTER TABLE `alias` MODIFY COLUMN `command` text', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_ed5fcb69444dcb0abf0a71053b` ON `alias` (`command`)', undefined);
    await queryRunner.query('ALTER TABLE `alias` MODIFY COLUMN `command` varchar(255)', undefined);
  }

}
