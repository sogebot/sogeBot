import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { default as tz } from 'dayjs/plugin/timezone';
import glob from 'glob';
dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

// load locales
const loadLocales = () => {
  const list = new Set(glob
    .sync('./locales/*')
    .map(o => o.replace('./locales/', '').replace('.json', ''))
  );
  for(const key of list) {
    require('dayjs/locale/' + key);
  }
};
loadLocales();

export const timezone = (process.env.TIMEZONE ?? 'system') === 'system' || !process.env.TIMEZONE ? dayjs.tz.guess() : process.env.TIMEZONE;
