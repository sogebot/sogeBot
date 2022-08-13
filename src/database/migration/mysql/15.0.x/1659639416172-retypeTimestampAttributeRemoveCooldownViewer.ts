import { MigrationInterface, QueryRunner } from 'typeorm';

export class retypeTimestampAttributeRemoveCooldownViewer1659639416172 implements MigrationInterface {
  name = 'retypeTimestampAttributeRemoveCooldownViewer1659639416172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`cooldown_viewer\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}