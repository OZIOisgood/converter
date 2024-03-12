import { IPropsMapper } from '../../../types/common.types';

export const buttonFilled: IPropsMapper<object> = {
  accent: {
    background: 'bg-accent',
    color: 'text-contrast',
    hover: 'hover:bg-accent-darker'
  },
  primary: {
    background: 'bg-tertiary',
    color: 'text-contrast',
    hover: 'hover:bg-tertiary-lighter'
  },
  secondary: {
    background: 'bg-secondary',
    color: 'text-secondary',
    hover: 'hover:bg-secondary-darker'
  },
  transparent: {
    background: 'bg-transparent',
    color: 'text-secondary',
    hover: 'hover:bg-transparent-darker'
  }
};

export default buttonFilled;
