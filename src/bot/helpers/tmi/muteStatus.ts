let _mute = false;

function setMuteStatus(status: boolean) {
  _mute = status;
}

function getMuteStatus() {
  return _mute;
}

export { setMuteStatus, getMuteStatus };