import { MigrationInterface, QueryRunner } from 'typeorm';

export class changeGoalTimestamps1651671003484 implements MigrationInterface {
  name = 'changeGoalTimestamps1651671003484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const goalGroup = await queryRunner.query(`SELECT * from \`goal_group\``);
    const goal = await queryRunner.query(`SELECT * from \`goal\``);

    await queryRunner.query(`DELETE \`goal_group\` WHERE 1=1`);
    await queryRunner.query(`DELETE \`group\` WHERE 1=1`);

    await queryRunner.query(`ALTER TABLE \`goal_group\` DROP COLUMN \`createdAt\``);
    await queryRunner.query(`ALTER TABLE \`goal_group\` ADD \`createdAt\` varchar(255) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`goal\` DROP COLUMN \`timestamp\``);
    await queryRunner.query(`ALTER TABLE \`goal\` ADD \`timestamp\` varchar(255) NULL`);
    await queryRunner.query(`ALTER TABLE \`goal\` DROP COLUMN \`endAfter\``);
    await queryRunner.query(`ALTER TABLE \`goal\` ADD \`endAfter\` varchar(255) NOT NULL`);

    for (const item of goalGroup) {
      const keys = Object.keys(item);
      item.createdAt = new Date(item.createdAt).toISOString();
      await queryRunner.query(
        `INSERT INTO \`goal_group\`(${keys.map(o => `\`${o}\``).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        keys.map(key => item[key]),
      );
    }

    for (const item of goal) {
      const keys = Object.keys(item);
      item.timestamp = new Date(item.timestamp).toISOString();
      item.endAfter = new Date(item.endAfter).toISOString();
      await queryRunner.query(
        `INSERT INTO \`goal\`(${keys.map(o => `\`${o}\``).join(', ')}) values (${keys.map(o => `?`).join(', ')})`,
        keys.map(key => item[key]),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
