import { MigrationInterface, QueryRunner } from 'typeorm';

export class tagIdAndLocaleUnique1582677505312 implements MigrationInterface {
  name = 'tagIdAndLocaleUnique1582677505312';

  public async up(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_dcf417a56c907f3a6788476047"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3"`, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dcf417a56c907f3a6788476047" ON "twitch_tag_localization_name" ("tagId", "locale") `, undefined);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3" ON "twitch_tag_localization_description" ("tagId", "locale") `, undefined);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.query(`DROP INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3"`, undefined);
    await queryRunner.query(`DROP INDEX "IDX_dcf417a56c907f3a6788476047"`, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_4d8108fc3e8dcbe5c112f53dd3" ON "twitch_tag_localization_description" ("tagId") `, undefined);
    await queryRunner.query(`CREATE INDEX "IDX_dcf417a56c907f3a6788476047" ON "twitch_tag_localization_name" ("tagId") `, undefined);
  }

}
