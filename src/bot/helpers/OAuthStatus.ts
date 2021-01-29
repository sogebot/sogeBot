const _status = {
  bot:         false,
  broadcaster: false,
};

function setOAuthStatus(type: keyof typeof _status, status: boolean) {
  _status[type] = status;
}

function getOAuthStatus(type: keyof typeof _status) {
  return _status[type];
}

export { setOAuthStatus, getOAuthStatus };
