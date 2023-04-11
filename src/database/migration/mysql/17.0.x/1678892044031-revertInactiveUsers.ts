import { MigrationInterface, QueryRunner } from 'typeorm';

export class revertInactiveUsers1678892044031 implements MigrationInterface {
  name = 'revertInactiveUsers1678892044031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.query(`SELECT * FROM \`user\``);
    for (const user of users) {
      await queryRunner.query(`UPDATE \`user\` SET \`userName\`=? WHERE \`userId\`=?`,
        [user.userName.replace(/__inactive__/g, ''), user.userId]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
