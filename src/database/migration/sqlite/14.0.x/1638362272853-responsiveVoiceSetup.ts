import { MigrationInterface, QueryRunner } from 'typeorm';

export class responsiveVoiceSetup1638362272853 implements MigrationInterface {
  name = 'responsiveVoiceSetup1638362272853';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const responsiveVoiceKey = (await queryRunner.query(`SELECT * from \`settings\``)).find((o: any) => {
      return o.namespace === '/integrations/responsivevoice';
    });
    if(responsiveVoiceKey) {
      await queryRunner.query(`DELETE from \`settings\` WHERE "id"=?`, [responsiveVoiceKey.id]);
      await queryRunner.query(`INSERT INTO \`settings\`("namespace", "name", "value") VALUES(?, ?, ?)`, ['/core/tts', 'responsiveVoiceKey', responsiveVoiceKey.value]);
      await queryRunner.query(`INSERT INTO \`settings\`("namespace", "name", "value") VALUES(?, ?, ?)`, ['/core/tts', 'service', JSON.stringify(0)]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
