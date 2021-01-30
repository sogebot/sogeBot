let _value = false;

const showWithAt = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { showWithAt };