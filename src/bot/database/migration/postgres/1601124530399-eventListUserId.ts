import {MigrationInterface, QueryRunner} from 'typeorm';
import axios from 'axios';
import { chunk } from 'lodash';

const mapping = new Map() as Map<string, string>;

export class eventListUserId1601124530399 implements MigrationInterface {
  name = 'eventListUserId1601124530399';

  public async up(queryRunner: QueryRunner): Promise<void> {

    const accessToken = (await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
      return o.namespace === '/core/oauth' && (o.name === 'broadcasterAccessToken' || o.name === 'botAccessToken') ;
    })?.value;
    const clientId = (await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
      return o.namespace === '/core/oauth' && (o.name === 'broadcasterClientId' || o.name === 'botClientId') ;
    })?.value;

    const events = await queryRunner.query(`SELECT * from "event_list"`);
    if ((!accessToken || !clientId) && events.length > 0) {
      throw new Error('Missing accessToken for bot or broadcaster, please set it up before bot upgrade.');
    }
    const evUsernamesFrom = events.filter((o: any) => JSON.parse(o.values_json).from && JSON.parse(o.values_json).from !== 'n/a').map((o: any) => JSON.parse(o.values_json).from);
    const uniqueUsernames = [...new Set([...evUsernamesFrom, ...events.filter((o: any) => /^[\x00-\x7F]*$/.test(o.username)).map((o: any) => o.username)])];

    for (const batch of chunk(uniqueUsernames, 100)) {
      const request = await axios.get(`https://api.twitch.tv/helix/users?login=${batch.join('&login=')}`, {
        headers: {
          'Authorization': 'Bearer ' + JSON.parse(accessToken),
          'Client-ID': JSON.parse(clientId),
        },
        timeout: 20000,
      });
      for (const data of request.data.data) {
        mapping.set(data.login, data.id);
      }
    }
    const migratedEvents = events.filter((o: any) => mapping.has(o.username)).map((o: any) => {
      const username = o.username;
      const values = JSON.parse(o.values_json);
      delete o.username;
      if (values.from) {
        values.from = values.from === 'n/a' ? '0' : mapping.get(values.from);
      }
      return { ...o, userId: mapping.get(username), values_json: JSON.stringify(values) };
    });
    await queryRunner.query(`CREATE TABLE "temporary_event_list" ("id" SERIAL NOT NULL, "event" character varying NOT NULL, "userId" character varying NOT NULL, "timestamp" bigint NOT NULL, "values_json" text NOT NULL, "isTest" boolean NOT NULL, CONSTRAINT "PK_1cc2e9353e9ae8acf95d976cf6g" PRIMARY KEY ("id"))`, undefined);
    for (const event of migratedEvents) {
      await queryRunner.query(
        `INSERT INTO temporary_event_list(${Object.keys(event).join(', ')}) values(${Object.keys(event).map((o: any) => '?')})`, [ ...Object.keys(event).map(key => event[key]) ]
      );
    }
    await queryRunner.query(`DROP TABLE "event_list"`);
    await queryRunner.query(`ALTER TABLE "temporary_event_list" RENAME TO "event_list"`);
    await queryRunner.query(`CREATE INDEX "IDX_8a80a3cf6b2d815920a390968a" ON "event_list" ("userId") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Please revert you db from backup.');
  }
}
