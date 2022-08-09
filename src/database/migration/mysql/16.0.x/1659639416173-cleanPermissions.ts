import { MigrationInterface, QueryRunner } from 'typeorm';

export class cleanPermissions1659639416173 implements MigrationInterface {
  name = 'cleanPermissions1659639416173';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM \`permissions\` WHERE 1=1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}