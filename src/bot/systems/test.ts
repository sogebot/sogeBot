import _ from 'lodash';

import { settings } from '../decorators';
import System from './_interface';

/*
 * !bet                                                                          - gets an info about bet
 * !bet [option-index] [amount]                                                  - bet [amount] of points on [option]
 * !bet open [-timeout 5] -title "your bet title" option | option | option | ... - open a new bet with selected options
 *                                                                               - -timeout in minutes - optional: default 2
 *                                                                               - -title - must be in "" - optional
 * !bet close [option]                                                           - close a bet and select option as winner
 * !bet refund                                                                   - close a bet and refund all participants
 * !set betPercentGain [0-100]                                                   - sets amount of gain per option
 */

class Test extends System {
  @settings({ category: 'test' })
  public ahoj = 'sss';
}

export default Test;
export { Test };
