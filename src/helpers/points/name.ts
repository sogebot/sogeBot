let _value = '';

const name = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { name };