let _value = '';

const botProfileUrl = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { botProfileUrl };