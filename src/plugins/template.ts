import { getGlobalVariables } from '~/helpers/checkFilter';
import { flatten } from '~/helpers/flatten';
import { showWithAt } from '~/helpers/tmi';

export async function template(message: string, params: Record<string, any>, userstate?: { userName: string; userId: string }) {
  params = flatten({
    ...params,
    sender: {
      userName: userstate?.userName,
      userId:   userstate?.userId,
    },
  });
  const regexp = new RegExp(`{ *?(?<variable>[a-zA-Z0-9.]+) *?}`, 'g');
  const match = message.matchAll(regexp);
  for (const item of match) {
    message = message.replace(item[0], params[item[1]]);
  }

  // global variables replacer
  if (!message.includes('$')) {
    // message doesn't have any variables
    return message;
  }

  const variables = await getGlobalVariables(message, { sender: userstate });
  for (const variable of Object.keys(variables)) {
    const regexp2 = new RegExp(`\\${variable}`, 'g');
    message = message.replace(regexp2, String(variables[variable as keyof typeof variables] ?? ''));
  }

  if (userstate) {
    message = message.replace(/\$sender/g, showWithAt ? `@${userstate.userName}` : userstate.userName);
  }
  return message;
}