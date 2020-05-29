import { getRepository } from 'typeorm';
import { Settings } from '../database/entity/settings';
import axios from 'axios';

export const getUserFromTwitch = async (username: string) => {
  return (await getUsersFromTwitch([username]))[0];
};


export const getUsersFromTwitch = async (usernames: string[])  => {
  const url = `https://api.twitch.tv/helix/users?login=${usernames.join('&login=')}`;
  /*
    {
      "data": [{
        "id": "44322889",
        "login": "dallas",
        "display_name": "dallas",
        "type": "staff",
        "broadcaster_type": "",
        "description": "Just a gamer playing games and chatting. :)",
        "profile_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-profile_image-1a2c906ee2c35f12-300x300.png",
        "offline_image_url": "https://static-cdn.jtvnw.net/jtv_user_pictures/dallas-channel_offline_image-1a2c906ee2c35f12-1920x1080.png",
        "view_count": 191836881,
        "email": "login@provider.com"
      }]
    }
  */

  const token = await getRepository(Settings).findOne({
    where: {
      name: 'botAccessToken',
      namespace: '/core/oauth',
    },
  });

  const clientId = await getRepository(Settings).findOne({
    where: {
      name: 'botClientId',
      namespace: '/core/oauth',
    },
  });

  if (!token) {
    throw Error('Missing oauth token');
  }

  if (!clientId) {
    throw Error('Missing oauth clientId');
  }

  const request = await axios.get(url, {
    headers: {
      'Authorization': 'Bearer ' + JSON.parse(token.value),
      'Client-ID': JSON.parse(clientId.value),
    },
  });

  return request.data.data as {
    id: string; login: string; display_name: string; profile_image_url: string;
  }[];
};