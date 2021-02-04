export type rateHeaders = {
  'ratelimit-remaining': number; 'ratelimit-reset': number; 'ratelimit-limit': number;
};

const limitProxy = {
  get: function (obj: { limit: number; remaining: number; refresh: number }, prop: 'limit' | 'remaining' | 'refresh') {
    if (typeof obj[prop] === 'undefined') {
      if (prop === 'limit') {
        return 120;
      }
      if (prop === 'remaining') {
        return 800;
      }
      if (prop === 'refresh') {
        return (Date.now() / 1000) + 90;
      }
    } else {
      return obj[prop];
    }
  },
  set: function (obj: { limit: number; remaining: number; refresh: number }, prop: 'limit' | 'remaining' | 'refresh', value: number) {
    if (Number(value) === Number(obj[prop])) {
      return true;
    }
    value = Number(value);
    obj[prop] = value;
    return true;
  },
};

const calls = {
  bot: new Proxy({
    limit: 120, remaining: 800, refresh: (Date.now() / 1000) + 90, 
  }, limitProxy),
  broadcaster: new Proxy({
    limit: 120, remaining: 800, refresh: (Date.now() / 1000) + 90, 
  }, limitProxy),
};

function setRateLimit(key: 'bot' | 'broadcaster', headers: {
  'ratelimit-remaining': number; 'ratelimit-reset': number; 'ratelimit-limit': number;
}) {
  calls[key].remaining = headers['ratelimit-remaining'];
  calls[key].limit = headers['ratelimit-limit'];
  calls[key].refresh = headers['ratelimit-reset'];
}

function emptyRateLimit(key: 'bot' | 'broadcaster', headers: rateHeaders) {
  calls[key].remaining = 0;
  calls[key].refresh = headers['ratelimit-reset'];
}

export {
  calls, setRateLimit, emptyRateLimit, 
};