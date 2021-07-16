let _value = false;

const sendWithMe = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { sendWithMe };