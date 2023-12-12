import { dayjs } from './dayjsHelper.js';

export function getTime(time: null | number, isChat: false): string;
export function getTime(time: null | number, isChat: true): string;
export function getTime(time: null | number, isChat: boolean) {
  let days: string | number = 0;
  let hours: string | number = 0;
  let minutes: string | number = 0;
  let seconds: string | number = 0;
  const now = time === null || !time
    ? {
      days: 0, hours: 0, minutes: 0, seconds: 0,
    }
    : timestampToObject(dayjs().valueOf() - dayjs(time).valueOf());
  if (isChat) {
    days = now.days > 0 ? now.days : '';
    hours = now.hours > 0 ? now.hours : '';
    minutes = now.minutes > 0 ? now.minutes : '';
    seconds = now.seconds > 0 ? now.seconds : '';

    if (days === '' && hours === '' && minutes === '' && seconds === '') {
      seconds = 1; // set seconds to 1 if everything else is missing
    }
    return {
      days,
      hours,
      minutes,
      seconds,
    };
  } else {
    days = now.days > 0 ? now.days + 'd' : '';
    hours = now.hours >= 0 && now.hours < 10 ? '0' + now.hours + ':' : now.hours + ':';
    minutes = now.minutes >= 0 && now.minutes < 10 ? '0' + now.minutes + ':' : now.minutes + ':';
    seconds = now.seconds >= 0 && now.seconds < 10 ? '0' + now.seconds : now.seconds;
    return days + hours + minutes + seconds;
  }
}

export function timestampToObject(timestamp: null | number) {
  let days: string | number = 0;
  let hours: string | number = 0;
  let minutes: string | number = 0;
  let seconds: string | number = 0;

  if (timestamp) {
    days = Math.floor(timestamp / 86400000);
    if (days >= 1) {
      timestamp -= days * 86400000;
    }

    hours = Math.floor(timestamp / 3600000);
    if (hours >= 1) {
      timestamp -= hours * 3600000;
    }

    minutes = Math.floor(timestamp / 60000);
    if (minutes >= 1) {
      timestamp -= minutes * 60000;
    }

    seconds = Math.floor(timestamp / 1000);
  }

  return {
    days: Math.floor(days), hours: Math.floor(hours), minutes: Math.floor(minutes), seconds: Math.floor(seconds),
  };
}