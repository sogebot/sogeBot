import { MigrationInterface, QueryRunner } from 'typeorm';

export class socketsTable1574119687882 implements MigrationInterface {
  name = 'socketsTable1574119687882';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DELETE FROM `settings` WHERE `namespace`=\'/core/socket\' AND `name`=\'socketsTokenAuthList\'', undefined);
    await queryRunner.query('CREATE TABLE `socket` (`id` varchar(36) NOT NULL, `userId` int NOT NULL, `type` varchar(10) NOT NULL, `accessToken` varchar(36) NULL, `refreshToken` varchar(36) NULL, `accessTokenTimestamp` bigint NOT NULL DEFAULT 0, `refreshTokenTimestamp` bigint NOT NULL DEFAULT 0, PRIMARY KEY (`id`)) ENGINE=InnoDB', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('DROP TABLE `socket`', undefined);
  }

}
