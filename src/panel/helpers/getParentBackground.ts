function getParentBackground(element: HTMLElement): string {
  if (element.parentElement) {
    const color = window.getComputedStyle(element.parentElement, null).getPropertyValue('background-color');
    if (color !== 'rgba(0, 0, 0, 0)') {
      return color;
    }
    return getParentBackground(element.parentElement);
  } else {
    return 'unset';
  }
}

export { getParentBackground };