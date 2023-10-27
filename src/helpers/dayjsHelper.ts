import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import duration from 'dayjs/plugin/duration.js';
import localizedFormat from 'dayjs/plugin/localizedFormat.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import { default as tz } from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(duration);

import('dayjs/locale/cs.js');
import('dayjs/locale/de.js');
import('dayjs/locale/en.js');
import('dayjs/locale/fr.js');
import('dayjs/locale/pt.js');
import('dayjs/locale/ru.js');
import('dayjs/locale/uk.js');

let timezone: string;
if (typeof process !== 'undefined') {
  timezone = (process.env.TIMEZONE ?? 'system') === 'system' || !process.env.TIMEZONE ? dayjs.tz.guess() : process.env.TIMEZONE;
} else {
  timezone = dayjs.tz.guess();
}
export const setLocale = (locale: string) => {
  dayjs.locale(locale);
};

export { dayjs, timezone };