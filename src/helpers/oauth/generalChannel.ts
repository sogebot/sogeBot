let _value = '';

const generalChannel = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { generalChannel };