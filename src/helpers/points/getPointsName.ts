import { name } from './name.js';
import { getLocalizedName } from '../getLocalizedName.js';

function getPointsName (points: number): string {
  return getLocalizedName(points, name.value);
}

export { getPointsName };