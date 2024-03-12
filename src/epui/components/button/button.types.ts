import { CommonColorsType, IPropsMapper } from '../../types/common.types';
import buttonFilled from './theme/button-filled';
import buttonOutlined from './theme/button-outline';

export type ButtonVariantType = 'filled' | 'outlined';
export type ButtonSizeType = 'sm' | 'md' | 'lg';
export type ButtonColorType = CommonColorsType;
export type ButtonFullWidthType = boolean;
export type ButtonRippleType = boolean;
export type ButtonClassNameType = string;

export interface Button {
  variant: ButtonVariantType;
  size: ButtonSizeType;
  color: ButtonColorType;
  fullWidth: ButtonFullWidthType;
  className: ButtonClassNameType;
}

export const DefaultButton: Button = {
  variant: 'filled',
  size: 'md',
  color: 'primary',
  fullWidth: false,
  className: ''
};

export const DefaultButtonPropsMapper: IPropsMapper<string> = {
  sm: 'py-2 px-3 text-xs',
  md: 'py-2.5 px-5 text-sm',
  lg: 'py-3 px-6 text-md'
};

/**
 * Button Variant Mapper
 * Map the variant of the button
 */
export const ButtonVariantMapper: IPropsMapper<IPropsMapper<object>> = {
  filled: buttonFilled,
  outlined: buttonOutlined
};
