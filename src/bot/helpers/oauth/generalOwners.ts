let _value: string[] = [];

const generalOwners = {
  set value(value: typeof _value) {
    _value = value;
  },
  get value() {
    return _value;
  },
};

export { generalOwners };