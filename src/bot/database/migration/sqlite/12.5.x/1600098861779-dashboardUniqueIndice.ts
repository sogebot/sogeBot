import { MigrationInterface, QueryRunner } from 'typeorm';

export class dashboardUniqueIndice1600098861779 implements MigrationInterface {
  name = 'dashboardUniqueIndice1600098861779';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dashboard_userId_createdAt_type" ON "dashboard" ("userId", "createdAt", "type") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_dashboard_userId_createdAt_type"`);
  }

}
