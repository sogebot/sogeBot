import axios from 'axios';

import { getClientId } from '../helpers/api/getClientId';
import { getToken } from '../helpers/api/getToken';
import { error } from '../helpers/log';

export const fetchUser = async (id: string): Promise<{
  'id': string,
  'login': string,
  'display_name': string,
  'type': string,
  'broadcaster_type': string,
  'description': string,
  'profile_image_url': string,
  'offline_image_url': string,
  'view_count': number,
  'email': string
}> => {
  const url = `https://api.twitch.tv/helix/users?id=${id}`;
  let request;
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

  const token = await getToken('bot');
  const clientId = await getClientId('bot');

  try {
    request = await axios.get(url, {
      headers: {
        'Authorization': 'Bearer ' + token,
        'Client-ID':     clientId,
      },
      timeout: 20000,
    });

    return request.data.data[0];
  } catch (e: any) {
    if (e instanceof Error) {
      error(e.stack);
    }

    throw e;
  }
};