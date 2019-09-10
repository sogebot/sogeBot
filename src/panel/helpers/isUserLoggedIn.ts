import axios from 'axios';
import { get } from 'lodash';

export const isUserLoggedIn = async function () {
  // check if we have auth code
  const code = localStorage.getItem('code') || '';
  if (code === null || code.trim().length === 0) {
    console.log('Redirecting, user is not authenticated');
    window.location.replace(window.location.origin + '/login');
  } else {
    const axiosData = await axios.get(`https://api.twitch.tv/helix/users`, {
      headers: {
        'Authorization': 'Bearer ' + code
      }
    });
    const data = get(axiosData, 'data.data[0]', null)
    if (data === null) {
      console.log('Redirecting, user code expired');
      window.location.replace(window.location.origin + '/login');
    }
    return data;
  }
}