import Core from './_interface';

class UI extends Core {
  constructor() {
    const options: InterfaceSettings = {
      settings: {
        theme: 'light',
        percentage: true,
        shortennumbers: true,
        stickystats: false,
        showdiff: true,
      },
      ui: {
        theme: {
          type: 'selector',
          values: ['light', 'dark'],
        },
      },
    };

    super(options);
  }
}

module.exports = UI;
