/**
 * Design Tokens matching DESIGN.md specification
 */
export const Colors = {
  light: {
    background: '#FFFFFF', // pure white background
    backgroundSecondary: '#F8FAF9',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F5F7',

    primary: '#0C3B3A', // deep teal
    primaryStrong: '#07302F',
    primaryPressed: '#062725',
    onPrimary: '#FFFFFF',

    textPrimary: '#0C292A',
    textSecondary: '#425F5C',
    textMuted: '#748985',
    border: '#D4E3D7',

    accent: '#BCEB82', // lime accent
    accentSoft: '#DEF5B8',
    accentText: '#24451F',

    income: '#23835B',
    incomeSurface: '#E6F6EE',

    expense: '#D65B5B',
    expenseSurface: '#FDECEC',

    warning: '#B87912',
    warningSurface: '#FFF3D5',

    overlay: 'rgba(7, 32, 31, 0.46)',
    cardBackground: '#FDFEFD',
    surfaceElement: '#EDF4EB',
    surfaceHighlight: '#F8FAFC',
    surfaceButton: '#F4F5F7',
    deepTeal: '#0C3B3A',
    darkSurfaceStrong: '#071F20',
    onSurfaceStrong: '#FFFFFF',
    softLime: '#BCEB82',
    tint: '#0C3B3A',
  },
  dark: {
    background: '#072423',
    backgroundSecondary: '#051B1A',
    surface: '#0C3B3A',
    surfaceMuted: '#104948',

    primary: '#BCEB82',
    primaryStrong: '#A9E366',
    primaryPressed: '#92D94B',
    onPrimary: '#07302F',

    textPrimary: '#F1F8EF',
    textSecondary: '#A5C4C0',
    textMuted: '#6B8C88',
    border: '#1E5250',

    accent: '#BCEB82',
    accentSoft: '#24451F',
    accentText: '#BCEB82',

    income: '#4ADE80',
    incomeSurface: '#133923',

    expense: '#FF8585',
    expenseSurface: '#3D1D1D',

    warning: '#FACC15',
    warningSurface: '#3D3110',

    overlay: 'rgba(0, 0, 0, 0.65)',
    cardBackground: '#0C3B3A',
    surfaceElement: '#104948',
    surfaceHighlight: '#072423',
    surfaceButton: '#104948',
    deepTeal: '#0C3B3A',
    darkSurfaceStrong: '#071F20',
    onSurfaceStrong: '#FFFFFF',
    softLime: '#BCEB82',
    tint: '#BCEB82',
  },
} as const;

export type ThemeColors = typeof Colors.light | typeof Colors.dark;

export function getTheme(colorScheme?: string | null): ThemeColors {
  return colorScheme === 'dark' ? Colors.dark : Colors.light;
}
