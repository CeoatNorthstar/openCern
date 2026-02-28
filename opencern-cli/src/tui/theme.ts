// OpenCERN TUI Theme System
// Inspired by OpenCode's theme architecture

export interface ThemeColors {
  // Brand
  primary: string;
  secondary: string;
  accent: string;

  // Status
  error: string;
  warning: string;
  success: string;
  info: string;

  // Text
  text: string;
  textMuted: string;
  textDim: string;

  // Backgrounds
  background: string;
  backgroundPanel: string;
  backgroundElement: string;

  // Borders
  border: string;
  borderActive: string;
  borderSubtle: string;

  // Syntax / Markdown
  codeText: string;
  codeBorder: string;
  heading: string;
  link: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

const opencernDark: ThemeColors = {
  primary: '#4FC3F7',       // CERN blue / light blue
  secondary: '#B388FF',     // Quantum purple
  accent: '#00E676',        // Active green

  error: '#FF5252',
  warning: '#FFD740',
  success: '#69F0AE',
  info: '#40C4FF',

  text: '#E0E0E0',
  textMuted: '#757575',
  textDim: '#424242',

  background: '',           // Transparent / terminal default
  backgroundPanel: '#1A1A1A',
  backgroundElement: '#262626',

  border: '#333333',
  borderActive: '#4FC3F7',
  borderSubtle: '#1E1E1E',

  codeText: '#A5D6A7',
  codeBorder: '#333333',
  heading: '#E0E0E0',
  link: '#4FC3F7',
};

const opencernLight: ThemeColors = {
  primary: '#0277BD',
  secondary: '#6200EA',
  accent: '#00C853',

  error: '#D32F2F',
  warning: '#F9A825',
  success: '#2E7D32',
  info: '#0277BD',

  text: '#212121',
  textMuted: '#757575',
  textDim: '#BDBDBD',

  background: '',
  backgroundPanel: '#F5F5F5',
  backgroundElement: '#EEEEEE',

  border: '#E0E0E0',
  borderActive: '#0277BD',
  borderSubtle: '#F5F5F5',

  codeText: '#2E7D32',
  codeBorder: '#E0E0E0',
  heading: '#212121',
  link: '#0277BD',
};

export const themes: Record<string, { dark: ThemeColors; light: ThemeColors }> = {
  opencern: { dark: opencernDark, light: opencernLight },
};

let currentTheme: ThemeColors = opencernDark;
let currentMode: 'dark' | 'light' = 'dark';

export function setThemeMode(mode: 'dark' | 'light') {
  currentMode = mode;
  currentTheme = themes.opencern[mode];
}

export function getTheme(): ThemeColors {
  return currentTheme;
}

export function getThemeMode(): 'dark' | 'light' {
  return currentMode;
}

// Initialize
setThemeMode('dark');
