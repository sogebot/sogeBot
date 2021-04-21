import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeTipsAndBitsRelation1618939162326 implements MigrationInterface {
  name = 'removeTipsAndBitsRelation1618939162326';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_tip` DROP FOREIGN KEY `FK_36683fb221201263b38344a9880`');
    await queryRunner.query('ALTER TABLE `user_bit` DROP FOREIGN KEY `FK_cca96526faa532e7d20a0f775b0`');
    await queryRunner.query('DROP INDEX `FK_36683fb221201263b38344a9880` ON `user_tip`');
    await queryRunner.query('DROP INDEX `FK_cca96526faa532e7d20a0f775b0` ON `user_bit`');
    await queryRunner.query('ALTER TABLE `user_tip` CHANGE `userUserId` `userId` varchar(255) NULL');
    await queryRunner.query('ALTER TABLE `user_bit` CHANGE `userUserId` `userId` varchar(255) NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `user_bit` CHANGE `userId` `userUserId` varchar(255) NULL');
    await queryRunner.query('ALTER TABLE `user_tip` CHANGE `userId` `userUserId` varchar(255) NULL');
    await queryRunner.query('ALTER TABLE `user_bit` ADD CONSTRAINT `FK_cca96526faa532e7d20a0f775b0` FOREIGN KEY (`userUserId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE');
    await queryRunner.query('ALTER TABLE `user_tip` ADD CONSTRAINT `FK_36683fb221201263b38344a9880` FOREIGN KEY (`userUserId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE');
    await queryRunner.query('CREATE INDEX `FK_cca96526faa532e7d20a0f775b0` ON `user_bit` (`userId`)');
    await queryRunner.query('CREATE INDEX `FK_36683fb221201263b38344a9880` ON `user_tip` (`userId`)');
    await queryRunner.query('ALTER TABLE `user_bit` CHANGE `userId` `userUserId` varchar(255) NULL');
    await queryRunner.query('ALTER TABLE `user_tip` CHANGE `userId` `userUserId` varchar(255) NULL');
  }

}
