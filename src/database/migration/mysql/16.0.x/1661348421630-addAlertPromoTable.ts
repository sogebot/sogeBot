import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAlertPromoTable1661348421630 implements MigrationInterface {
  name = 'addAlertPromoTable1661348421630';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`alert_promo\` (\`id\` varchar(36) NOT NULL, \`alertId\` varchar(255) NULL, \`enabled\` tinyint NOT NULL, \`title\` varchar(255) NOT NULL, \`variantAmount\` int NOT NULL, \`messageTemplate\` varchar(255) NOT NULL, \`ttsTemplate\` varchar(255) NOT NULL DEFAULT '', \`layout\` varchar(255) NOT NULL, \`animationIn\` varchar(255) NOT NULL, \`animationInDuration\` int NOT NULL DEFAULT '2000', \`animationOut\` varchar(255) NOT NULL, \`animationOutDuration\` int NOT NULL DEFAULT '2000', \`animationText\` varchar(255) NOT NULL, \`animationTextOptions\` text NOT NULL, \`imageId\` varchar(255) NULL, \`imageOptions\` text NOT NULL, \`filter\` text NULL, \`soundId\` varchar(255) NULL, \`soundVolume\` int NOT NULL, \`alertDurationInMs\` int NOT NULL, \`alertTextDelayInMs\` int NOT NULL, \`enableAdvancedMode\` tinyint NOT NULL, \`advancedMode\` text NOT NULL, \`tts\` text NOT NULL, \`font\` text NULL, \`message\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    await queryRunner.query(`ALTER TABLE \`alert_promo\` ADD CONSTRAINT \`FK_4e34eee32f20813d614feb05847\` FOREIGN KEY (\`alertId\`) REFERENCES \`alert\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`alert_promo\` DROP FOREIGN KEY \`FK_4e34eee32f20813d614feb05847\``);
    await queryRunner.query(`DROP TABLE \`alert_promo\``);
  }

}
