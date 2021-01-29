import axios from 'axios';

import { getClientId, getToken } from '../helpers/api';

type Await<T> = T extends {
  then(onfulfilled?: (value: infer U) => unknown): unknown;
} ? U : T;

export const getUserFromTwitch = async (username: string): Promise<Await<ReturnType<typeof getUsersFromTwitch>>[number]> => {
  const user = (await getUsersFromTwitch([username]))[0];
  if (typeof user === 'undefined') {
    throw new Error(`User ${username} not found on twitch`);
  }
  return (await getUsersFromTwitch([username]))[0];
};

export const getUsersFromTwitch = async (usernames: string[]): Promise<{
  id: string; login: string; display_name: string; profile_image_url: string;
}[]>  => {
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

  const request = await axios.get(url, {
    headers: {
      'Authorization': 'Bearer ' + await getToken('bot'),
      'Client-ID':     await getClientId('bot'),
    },
  });

  return request.data.data;
};