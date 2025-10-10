/**
 * ASC Challenge Platform Design System
 * 
 * Color Palette & Typography Guidelines
 */

export const colorPalette = {
  primary: {
    DEFAULT: '#004E89',
    hover: '#003A68',
    active: '#002747',
    foreground: '#FFFFFF',
  },
  secondary: {
    DEFAULT: '#1F77B4',
    hover: '#176399',
    active: '#104F7E',
    foreground: '#FFFFFF',
  },
  accent: {
    DEFAULT: '#FFB400',
    hover: '#E6A200',
    active: '#CC9000',
    foreground: '#000000',
  },
  gray: {
    50: '#F5F7FA',
    100: '#E5E9EF',
    200: '#C9D1DB',
    300: '#9AA5B6',
    400: '#788593',
    500: '#4F5D6D',
    600: '#363F4D',
    700: '#2E3A46',
    800: '#1E252E',
    900: '#131820',
  },
} as const;

export const typography = {
  fontFamily: {
    heading: ['Inter', 'sans-serif'],
    body: ['Roboto', 'sans-serif'],
  },
  fontSize: {
    h1: {
      size: '3.5rem',     // 56px
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
      fontWeight: '700',
    },
    h2: {
      size: '3rem',       // 48px
      lineHeight: '1.25',
      letterSpacing: '-0.01em',
      fontWeight: '700',
    },
    h3: {
      size: '2.5rem',     // 40px
      lineHeight: '1.3',
      letterSpacing: '-0.01em',
      fontWeight: '600',
    },
    h4: {
      size: '2rem',       // 32px
      lineHeight: '1.35',
      letterSpacing: '0',
      fontWeight: '600',
    },
    h5: {
      size: '1.5rem',     // 24px
      lineHeight: '1.4',
      letterSpacing: '0',
      fontWeight: '600',
    },
    h6: {
      size: '1.25rem',    // 20px
      lineHeight: '1.45',
      letterSpacing: '0',
      fontWeight: '600',
    },
    'body-lg': {
      size: '1.125rem',   // 18px
      lineHeight: '1.75',
      letterSpacing: '0',
      fontWeight: '400',
    },
    body: {
      size: '1rem',       // 16px
      lineHeight: '1.5',
      letterSpacing: '0',
      fontWeight: '400',
    },
    'body-sm': {
      size: '0.875rem',   // 14px
      lineHeight: '1.5',
      letterSpacing: '0',
      fontWeight: '400',
    },
    'body-xs': {
      size: '0.75rem',    // 12px
      lineHeight: '1.5',
      letterSpacing: '0',
      fontWeight: '400',
    },
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export type ColorPalette = typeof colorPalette;
export type Typography = typeof typography;

