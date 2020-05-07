import axios from 'axios';
import { get } from 'lodash-es';
import { getSocket } from './socket';

export const isUserLoggedIn = async function (mustBeLogged = true, mustBeAdmin = true) {
  // check if we have auth code
  const code = localStorage.getItem('code') || '';
  if (code.trim().length === 0) {
    if (mustBeLogged) {
      console.log('Redirecting, user is not authenticated');
      if (window.location.href.includes('popout')) {
        window.location.replace(window.location.origin + '/login#error=popout+must+be+logged#url=' + window.location.href);
        return false;
      } else {
        window.location.replace(window.location.origin + '/login');
        return false;
      }
    } else {
      console.debug('User is not needed to be logged, returning null');
      return null;
    }
  } else {
    try {
      let clientId = localStorage.getItem('clientId') || '';
      if (clientId.length === 0) {
        // we need first get useless clientId
        const dumbClientIdData = await axios.get(`https://id.twitch.tv/oauth2/validate`, {
          headers: {
            'Authorization': 'OAuth ' + code,
          },
        });
        clientId = dumbClientIdData.data.client_id;
        localStorage.setItem('clientId', clientId);
      }

      const axiosData = await axios.get(`https://api.twitch.tv/helix/users`, {
        headers: {
          'Authorization': 'Bearer ' + code,
          'Client-Id': clientId,
        },
      });
      const data = get(axiosData, 'data.data[0]', null);
      if (data === null) {
        localStorage.removeItem('userId');
        throw Error('User must be logged');
      }
      localStorage.setItem('userId', data.id);

      // set new authorization if set
      const newAuthorization = localStorage.getItem('newAuthorization');
      if (newAuthorization !== null) {
        await new Promise((resolve) => {
          getSocket('/', true).emit('newAuthorization', { userId: Number(data.id), username: data.login }, () => {
            resolve();
          });
        });
      }

      if (mustBeAdmin) {
        await new Promise((resolve, reject) => {
          const check = () => {
            const userType = localStorage.getItem('userType');
            if (!userType) {
              setTimeout(() => check(), 100);
            }

            if (userType) {
              if (userType === 'admin') {
                resolve();
              } else {
                reject('User doesn\'t have access to this endpoint');
              }
            }
          };
          check();
        });
      }

      localStorage.removeItem('newAuthorization');
      return data;
    } catch(e) {
      console.debug(e);
      if (mustBeLogged) {
        if (e === 'User doesn\'t have access to this endpoint') {
          window.location.replace(window.location.origin + '/login#error=must+be+caster');
        } else {
          console.log('Redirecting, user code expired');
          if (window.location.href.includes('popout')) {
            window.location.replace(window.location.origin + '/login#error=popout+must+be+logged');
          } else {
            window.location.replace(window.location.origin + '/login');
          }
        }
      }
      return null;
    }
  }
};
