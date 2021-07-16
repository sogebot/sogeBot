import { MigrationInterface, QueryRunner } from 'typeorm';

export class resetPoints1580154710641 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query('UPDATE `user` SET `chatTimeOnline`=0, `chatTimeOffline`=0, `pointsOnlineGivenAt`=0, `pointsOfflineGivenAt`=0, `pointsByMessageGivenAt`=0', undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    return;
  }

}
