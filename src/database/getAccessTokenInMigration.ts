import axios from 'axios';
import fetch from 'node-fetch';
import { QueryRunner } from 'typeorm';

const urls = {
  'SogeBot Token Generator':    'https://twitch-token-generator.soge.workers.dev/refresh/',
  'SogeBot Token Generator v2': 'https://credentials.sogebot.xyz/twitch/refresh/',
};
let accessToken: null | string = null;

export const getAccessTokenInMigration = async (queryRunner: QueryRunner, type: 'broadcaster' | 'bot'): Promise<string> => {
  if (accessToken) {
    return accessToken;
  }

  const tokenService = JSON.parse((await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
    return o.namespace === '/services/twitch' && o.name === 'tokenService';
  })?.value ?? '"SogeBot Token Generator"');
  const url = urls[tokenService as keyof typeof urls];
  const refreshToken = JSON.parse<string>((await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
    return o.namespace === '/services/twitch' && o.name === type + 'RefreshToken';
  })?.value ?? '""');

  if (!url) {
    const tokenServiceCustomClientId = JSON.parse<string>((await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
      return o.namespace === '/services/twitch' && o.name === 'tokenServiceCustomClientId';
    })?.value ?? '""');
    const tokenServiceCustomClientSecret = JSON.parse<string>((await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
      return o.namespace === '/services/twitch' && o.name === 'tokenServiceCustomClientSecret';
    })?.value ?? '""');
    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${tokenServiceCustomClientId}&client_secret=${tokenServiceCustomClientSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`, {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json() as { access_token: string };
      accessToken = data.access_token;
      return data.access_token;
    } else {
      throw new Error('Custom token refresh failed');
    }
  } else {
    const broadcasterId = JSON.parse<string>((await queryRunner.query(`SELECT * from settings `)).find((o: any) => {
      return o.namespace === '/services/twitch' && o.name === 'broadcasterId';
    })?.value ?? '""');

    const request = await axios(url + encodeURIComponent(refreshToken.trim()), {
      method:  'POST',
      headers: {
        'SogeBot-Channel': 'Done by Migration',
        'SogeBot-Owners':  'Migration done for ' + broadcasterId,
      },
    }) as any;
    if (!request.data.success) {
      throw new Error(`Token refresh: ${request.data.message}`);
    }
    if (typeof request.data.token !== 'string' || request.data.token.length === 0) {
      throw new Error(`Access token was not correctly fetched (not a string)`);
    }
    if (typeof request.data.refresh !== 'string' || request.data.refresh.length === 0) {
      throw new Error(`Refresh token was not correctly fetched (not a string)`);
    }
    accessToken = request.data.token;
    return request.data.token;
  }
};