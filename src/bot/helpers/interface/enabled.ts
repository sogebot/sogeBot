const _value: string[] = [];

const enabled = {
  enable(value: string) {
    if (!_value.includes(value)) {
      _value.push(value);
    }
  },
  disable(value: string) {
    const idx = _value.findIndex(o => o === value);
    if (idx > -1) {
      _value.splice(idx, 1);
    }
  },
  status(value: string) {
    return _value.includes(value);
  },
};

export { enabled };