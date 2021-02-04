import axios from 'axios';
import { get } from 'lodash-es';

export const isUserLoggedIn = async function (mustBeLogged = true, mustBeAdmin = true): Promise<any | boolean | null> {
  // check if we have auth code
  const code = localStorage.getItem('code') || '';
  if (code.trim().length === 0) {
    if (mustBeLogged) {
      console.log('Redirecting, user is not authenticated');
      sessionStorage.setItem('goto-after-login', location.href);
      if (window.location.href.includes('popout')) {
        window.location.assign(window.location.origin + '/login#error=popout+must+be+logged');
        return false;
      } else {
        window.location.assign(window.location.origin + '/login');
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
        const dumbClientIdData = await axios.get(`https://id.twitch.tv/oauth2/validate`, { headers: { 'Authorization': 'OAuth ' + code } });
        clientId = dumbClientIdData.data.client_id;
        localStorage.setItem('clientId', clientId);
      }

      const axiosData = await axios.get(`https://api.twitch.tv/helix/users`, {
        headers: {
          'Authorization': 'Bearer ' + code,
          'Client-Id':     clientId,
        },
      });
      const data = get(axiosData, 'data.data[0]', null);
      if (data === null) {
        localStorage.removeItem('userId');
        throw Error('User must be logged');
      }
      localStorage.setItem('userId', data.id);

      // get new authorization if we are missing access or refresh tokens
      const accessToken = localStorage.getItem('accessToken') || '';
      const refreshToken = localStorage.getItem('refreshToken') || '';
      const isNewAuthorization = accessToken.trim().length === 0 || refreshToken.trim().length === 0;
      if (isNewAuthorization) {
        await new Promise<void>((resolve) => {
          console.groupCollapsed('isUserLoggedIn::validate');
          console.groupEnd();

          axios.get(`${window.location.origin}/socket/validate`, {
            headers: {
              'x-twitch-token':  code,
              'x-twitch-userid': data.id,
            },
          }).then(validation => {
            localStorage.setItem('accessToken', validation.data.accessToken);
            localStorage.setItem('refreshToken', validation.data.refreshToken);
            localStorage.setItem('userType', validation.data.userType);
            resolve();
          }).catch(() => resolve());
        });
      }

      if (mustBeAdmin) {
        await new Promise<void>((resolve, reject) => {
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
      localStorage.setItem('cached-logged-user', JSON.stringify(data));
      return data;
    } catch(e) {
      console.debug(e);
      const data = JSON.parse(localStorage.getItem('cached-logged-user') || 'null');
      if (mustBeLogged) {
        if (e.message && e.message.toLowerCase().includes('network error') && data) {
          console.warn('Network error, using cached logged user', data);
          return data;
        }
        if (e === 'User doesn\'t have access to this endpoint') {
          window.location.assign(window.location.origin + '/login#error=must+be+caster');
        } else {
          console.log('Redirecting, user code expired');
          if (window.location.href.includes('popout')) {
            window.location.assign(window.location.origin + '/login#error=popout+must+be+logged');
          } else {
            window.location.assign(window.location.origin + '/login');
          }
        }
      }
      return data;
    }
  }
};
