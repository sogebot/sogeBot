let _value = 'localhost';

const domain = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { domain };