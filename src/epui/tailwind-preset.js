var epuiScreens = {
  default: '0px',
  xxs: '390px'
};

var epuiBorderWidth = {
  3: '3px'
};

var epuiFontFamilies = {
  sans: ['Inter', 'sans-serif']
};

var epuiBorderRadius = {
  primary: '0.3rem', // 5px
  secondary: '0.875rem', // 14px
  rounded: '1.25rem' // 25px
};

var epuiColors = {
  // Accent
  accent: '#d6001c',
  'accent-darker': '#70000f',

  // Primary
  primary: '#000000',
  'primary-darker': '#1d1d1b',

  // Secondary
  secondary: '#ffffff',
  'secondary-darker': '#eeeeee',

  // Semantic
  success: '#579645',
  process: '#1aae9f',
  warning: '#f0b913',
  danger: '#d36482',

  // Link
  link: '#3b82f6',
  'link-darker': '#1d4ed8',

  // Gray Scale
  grayScale: {
    0: '#ffffff', // white
    100: '#f5f5f5', // lightest-gray
    150: '#eeeeee',
    200: '#ebebeb', // lighter-gray
    300: '#e5e5e5', // light-gray
    350: '#dddddd',
    400: '#cccccc', // gray (text-colors)
    450: '#c3cfd9', // app-card border
    500: '#999999', // dark-gray
    600: '#808080', // gray (basic)
    700: '#666666', // gray-darker
    750: '#555555',
    800: '#343333', // darker-gray and gray-dark (same color, used twice)
    900: '#000000' // black
  },

  // Transparent
  transparent: 'transparent'
};

var epuiTextColors = {
  accent: epuiColors.accent,
  primary: epuiColors.grayScale[900],
  secondary: epuiColors.grayScale[800],
  placeholder: epuiColors.grayScale[500],
  contrast: epuiColors.grayScale[0],
  link: epuiColors.link,
  'link-darker': epuiColors['link-darker']
};

var epuiBackgroundColors = {
  // Accent
  accent: epuiColors.accent,
  'accent-darker': epuiColors['accent-darker'],

  // Primary
  primary: epuiColors.grayScale[100],
  'primary-darker': epuiColors.grayScale[350],

  // Secondary
  secondary: epuiColors.grayScale[0],
  'secondary-darker': epuiColors.grayScale[150],

  // Tertiary
  tertiary: epuiColors.grayScale[900],
  'tertiary-lighter': epuiColors.grayScale[800],

  // Transparent
  transparent: epuiColors.transparent,
  'transparent-darker': 'rgba(0, 0, 0, 0.1)'
};

module.exports = {
  theme: {
    extend: {
      screens: epuiScreens,
      borderWidth: epuiBorderWidth,
      borderRadius: epuiBorderRadius,
      colors: epuiColors,
      textColor: epuiTextColors,
      backgroundColor: epuiBackgroundColors,
      fontFamily: epuiFontFamilies
    }
  },
  plugins: []
};
