let _value = 0;

const loadedTokens = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { loadedTokens };