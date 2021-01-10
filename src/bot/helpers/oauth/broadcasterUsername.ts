let _value = '';

const broadcasterUsername = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { broadcasterUsername };