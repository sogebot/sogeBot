import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import { default as tz } from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(tz);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);

require('dayjs/locale/cs');
require('dayjs/locale/de');
require('dayjs/locale/en');
require('dayjs/locale/fr');
require('dayjs/locale/pt');
require('dayjs/locale/ru');
require('dayjs/locale/uk');

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