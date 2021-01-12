let _value = 0;

const chatMessagesAtStart = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { chatMessagesAtStart };