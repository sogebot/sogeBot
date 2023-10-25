import axios from 'axios';

import type { ResponseFilter } from './index.js';

const youtube: ResponseFilter = {
  '$youtube(url, #)': async function (filter: string) {
    const channel = filter
      .replace('$youtube(url,', '')
      .replace(')', '')
      .trim();
    try {
      const response = await axios.get<any>('https://www.youtube.com/channel/'+channel+'/videos?view=0&sort=dd');
      const match = new RegExp('"videoId":"(.*?)",.*?title":{"runs":\\[{"text":"(.*?)"}]', 'gm').exec(response.data);
      if (match) {
        return `https://youtu.be/${match[1]}`;
      } else {
        return 'n/a';
      }
    } catch (e: any) {
      const response = await axios.get<any>('https://www.youtube.com/user/'+channel+'/videos?view=0&sort=dd');
      const match = new RegExp('"videoId":"(.*?)",.*?title":{"runs":\\[{"text":"(.*?)"}]', 'gm').exec(response.data);
      if (match) {
        return `https://youtu.be/${match[1]}`;
      } else {
        return 'n/a';
      }
    }
  },
  '$youtube(title, #)': async function (filter: string) {
    const channel = filter
      .replace('$youtube(title,', '')
      .replace(')', '')
      .trim();
    try {
      const response = await axios.get<any>('https://www.youtube.com/channel/'+channel+'/videos?view=0&sort=dd');
      const match = new RegExp('"videoId":"(.*?)",.*?title":{"runs":\\[{"text":"(.*?)"}]', 'gm').exec(response.data);
      if (match) {
        return match[2];
      } else {
        return 'n/a';
      }
    } catch (e: any) {
      const response = await axios.get<any>('https://www.youtube.com/user/'+channel+'/videos?view=0&sort=dd');
      const match = new RegExp('"videoId":"(.*?)",.*?title":{"runs":\\[{"text":"(.*?)"}]', 'gm').exec(response.data);
      if (match) {
        return match[2];
      } else {
        return 'n/a';
      }
    }
  },
};

export { youtube };