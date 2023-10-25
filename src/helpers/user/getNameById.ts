import * as changelog from '~/helpers/user/changelog.js';
import twitch from '~/services/twitch.js';

export default async function getNameById (userId: string): Promise<string> {
  const user = await changelog.get(userId);
  if (!user) {
    const getUserById = await twitch.apiClient?.asIntent(['bot'], ctx => ctx.users.getUserById(userId));
    if (getUserById) {
      changelog.update(userId, { userName: getUserById.name });
      return getUserById.name;
    } else {
      throw new Error('Cannot get username for userId ' + userId);
    }
  }
  return user.userName;
}