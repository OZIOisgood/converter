export const convertToClassName = (str?: string): string => {
  return ' ' + str + ' ';
};

export const objectToStr = (obj?: object): string => {
  if (!obj) {
    return '';
  }

  let result: string[] = [];

  Object.values(obj).forEach(value => {
    if (typeof value === 'string') {
      result = [...result, value];
    } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
      result = [...result, objectToStr(value as object)];
    }

    return undefined;
  });

  return result.join(' ');
};
