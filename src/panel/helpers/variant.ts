import { ButtonStates } from './buttonStates';

const getVariantByState = (state: number) => {
  if (state === ButtonStates.fail) {
    return 'danger';
  }
  if (state === ButtonStates.progress) {
    return 'info';
  }
  if (state === ButtonStates.success) {
    return 'success';
  }
  return 'primary';
};

export { getVariantByState };