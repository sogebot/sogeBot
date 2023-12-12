function getDecimals (value: string | number) {
  return String(value).split('.')[1] ?? '';
}

function format (thousandsDelimiter = '', precision = 2) {
  return (value: number): string => {
    const decimalsDelimiter = thousandsDelimiter === '.' ? ',' : '.';

    let generatedNumber = '';
    const decimals = getDecimals(value);
    const decimalsLength = decimals.length > 0 ? decimals.length + 1 : 0;

    for (let i = 0; i < String(value).length - decimalsLength; i++) {
      const idx = (String(value).length - 1) - i - decimalsLength;
      generatedNumber += String(value)[idx];
      if (i % 3 === 2 && (i + 1) !== String(value).length - decimalsLength && i !== 0) {
        generatedNumber += thousandsDelimiter;
      }
    }

    generatedNumber = generatedNumber.split('').reverse().join('');

    if (decimalsLength > 0 && precision > 0) {
      generatedNumber += decimalsDelimiter + (getDecimals(Number.parseFloat(`0.${decimals}`).toFixed(precision)));
    }
    return generatedNumber;
  };
}

export { getDecimals, format };