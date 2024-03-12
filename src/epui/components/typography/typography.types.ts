export enum TypographySizesEnum {
  xs = 'text-xs',
  sm = 'text-sm',
  base = 'text-base',
  lg = 'text-lg',
  xl = 'text-xl',
  '2xl' = 'text-2xl',
  '3xl' = 'text-3xl'
}

export type TypographyClassNameType = string;
export type TypographySizeType = keyof typeof TypographySizesEnum;
export type TypographyIsBoldType = boolean;

export interface Typography {
  className: TypographyClassNameType;
  size: TypographySizeType;
  isBold: TypographyIsBoldType;
}

export const DefaultTypography: Typography = {
  className: '',
  size: 'base',
  isBold: false
};
