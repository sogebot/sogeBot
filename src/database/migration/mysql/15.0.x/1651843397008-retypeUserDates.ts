import { MigrationInterface, QueryRunner } from 'typeorm';

export class retypeUserDates1651843397008 implements MigrationInterface {
  name = 'retypeUserDates1651843397008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const viewers = await queryRunner.query(`SELECT * FROM \`user\``);

    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`followedAt\``);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`followedAt\` varchar(30) NULL`);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`subscribedAt\``);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`subscribedAt\` varchar(30) NULL`);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`seenAt\``);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`seenAt\` varchar(30) NULL`);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`createdAt\``);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`createdAt\` varchar(30) NULL`);

    // retype users
    for (const viewer of viewers) {
      viewer.followedAt = Number(viewer.followedAt) === 0 ? null : new Date(Number(viewer.followedAt)).toISOString();
      viewer.subscribedAt = Number(viewer.subscribedAt) === 0 ? null : new Date(Number(viewer.subscribedAt)).toISOString();
      viewer.seenAt = Number(viewer.seenAt) === 0 ? null : new Date(Number(viewer.seenAt)).toISOString();
      viewer.createdAt = Number(viewer.createdAt) === 0 ? null : new Date(Number(viewer.createdAt)).toISOString();
      await queryRunner.query(
        `UPDATE \`user\` SET \`followedAt\`=?,\`subscribedAt\`=?,\`seenAt\`=?,\`createdAt\`=? WHERE \`userId\`=?`,
        [ viewer.followedAt, viewer.subscribedAt, viewer.seenAt, viewer.createdAt, viewer.userId ]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    return;
  }

}
