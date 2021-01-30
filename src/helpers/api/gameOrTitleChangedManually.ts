let _gameOrTitleChangedManually = false;

const gameOrTitleChangedManually = {
  set value(value: typeof _gameOrTitleChangedManually) {
    _gameOrTitleChangedManually = value;
  },
  get value () {
    return _gameOrTitleChangedManually;
  },
};

export { gameOrTitleChangedManually };