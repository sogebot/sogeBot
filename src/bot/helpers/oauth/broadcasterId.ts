let _value = '';

const broadcasterId = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { broadcasterId };