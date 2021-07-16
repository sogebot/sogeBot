import { MigrationInterface, QueryRunner } from 'typeorm';

export class userIdToString1614510825911 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bets_participations\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`discord_link\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`duel\` MODIFY \`id\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`heist_user\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`points_changelog\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`quotes\` MODIFY \`quotedBy\` varchar(255)`);

    await queryRunner.query('ALTER TABLE `user_bit` DROP FOREIGN KEY `FK_cca96526faa532e7d20a0f775b0`', undefined);
    await queryRunner.query('ALTER TABLE `user_tip` DROP FOREIGN KEY `FK_36683fb221201263b38344a9880`', undefined);
    await queryRunner.query(`ALTER TABLE \`user_bit\` MODIFY \`userUserId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user_tip\` MODIFY \`userUserId\` varchar(255)`);
    await queryRunner.query(`ALTER TABLE \`user\` MODIFY \`userId\` varchar(255)`);
    await queryRunner.query('ALTER TABLE `user_tip` ADD CONSTRAINT `FK_36683fb221201263b38344a9880` FOREIGN KEY (`userUserId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
    await queryRunner.query('ALTER TABLE `user_bit` ADD CONSTRAINT `FK_cca96526faa532e7d20a0f775b0` FOREIGN KEY (`userUserId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);

    await queryRunner.query('ALTER TABLE `bets_participations` CHANGE `userId` `userId` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `cooldown_viewer` CHANGE `userId` `userId` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `moderation_warning` CHANGE `userId` `userId` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `moderation_permit` CHANGE `userId` `userId` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `points_changelog` CHANGE `userId` `userId` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `quotes` CHANGE `quotedBy` `quotedBy` varchar(255) NOT NULL');

    await queryRunner.query('DROP INDEX `IDX_dashboard_userId_createdAt_type` ON `dashboard`');
    await queryRunner.query('ALTER TABLE `dashboard` CHANGE `userId` `userId` varchar(255) NOT NULL');
    await queryRunner.query('ALTER TABLE `variable_history` CHANGE `userId` `userId` varchar(255) NOT NULL DEFAULT \'0\'');
    await queryRunner.query('CREATE UNIQUE INDEX `IDX_dashboard_userId_createdAt_type` ON `dashboard` (`userId`, `createdAt`, `type`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`bets_participations\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`cooldown_viewer\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`discord_link\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`duel\` MODIFY \`id\` int`);
    await queryRunner.query(`ALTER TABLE \`heist_user\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`moderation_warning\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`moderation_permit\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`points_changelog\` MODIFY \`userId\` int`);
    await queryRunner.query(`ALTER TABLE \`quotes\` MODIFY \`quotedBy\` int`);

    await queryRunner.query('ALTER TABLE `user_bit` DROP FOREIGN KEY `FK_cca96526faa532e7d20a0f775b0`', undefined);
    await queryRunner.query('ALTER TABLE `user_tip` DROP FOREIGN KEY `FK_36683fb221201263b38344a9880`', undefined);
    await queryRunner.query(`ALTER TABLE \`user_bit\` MODIFY \`userUserId\` int`);
    await queryRunner.query(`ALTER TABLE \`user_tip\` MODIFY \`userUserId\` int`);
    await queryRunner.query(`ALTER TABLE \`user\` MODIFY \`userId\` int`);
    await queryRunner.query('ALTER TABLE `user_tip` ADD CONSTRAINT `FK_36683fb221201263b38344a9880` FOREIGN KEY (`userUserId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
    await queryRunner.query('ALTER TABLE `user_bit` ADD CONSTRAINT `FK_cca96526faa532e7d20a0f775b0` FOREIGN KEY (`userUserId`) REFERENCES `user`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE', undefined);
  }
}