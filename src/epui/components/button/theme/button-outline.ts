import { IPropsMapper } from '../../../types/common.types';

const background = 'bg-transparent';
const hover = 'hover:bg-transparent-darker';

export const buttonOutlined: IPropsMapper<object> = {
  accent: {
    background,
    border: 'border border-accent',
    color: 'text-accent',
    hover
  },
  primary: {
    background,
    border: 'border border-primary',
    color: 'text-primary',
    hover
  },
  secondary: {
    background,
    border: 'border border-secondary',
    color: 'text-secondary',
    hover
  }
};

export default buttonOutlined;
