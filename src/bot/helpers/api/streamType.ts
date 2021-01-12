let _value = 'live';

const streamType = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { streamType };