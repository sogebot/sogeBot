let _value: null | string = null;

const streamId = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { streamId };