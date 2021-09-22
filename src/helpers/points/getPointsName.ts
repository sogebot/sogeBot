import { getLocalizedName } from '@sogebot/ui-helpers/getLocalized';

import { name } from './name';

function getPointsName (points: number): string {
  return getLocalizedName(points, name.value);
}

export { getPointsName };