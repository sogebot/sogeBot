import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeFollowersAttributes1659639416171 implements MigrationInterface {
  name = 'removeFollowersAttributes1659639416171';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`cooldown\` DROP COLUMN \`isFollowerAffected\``);
    await queryRunner.query(`ALTER TABLE \`queue\` DROP COLUMN \`isFollower\``);
    await queryRunner.query(`ALTER TABLE \`raffle\` DROP COLUMN \`forFollowers\``);
    await queryRunner.query(`ALTER TABLE \`raffle_participant\` DROP COLUMN \`isFollower\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`isFollower\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`haveFollowerLock\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`haveFollowedAtLock\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`followCheckAt\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`followedAt\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`followedAt\` varchar(30) NULL`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`followCheckAt\` bigint NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`haveFollowedAtLock\` tinyint NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`haveFollowerLock\` tinyint NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`isFollower\` tinyint NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE \`raffle_participant\` ADD \`isFollower\` tinyint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`raffle\` ADD \`forFollowers\` tinyint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`queue\` ADD \`isFollower\` tinyint NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`cooldown\` ADD \`isFollowerAffected\` tinyint NOT NULL`);
  }

}