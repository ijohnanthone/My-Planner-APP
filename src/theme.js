// Theme & Adaptive Contrast System for Planner App

export const APP_BACKGROUNDS = [
  {
    id: 'midnight',
    name: 'Midnight Dark',
    base: '#09090B',
    cozy: '#121215',
    card: '#18181B',
    cardElevated: '#242428',
    isPro: false,
    isLight: false,
    label: 'Dark Mode (Free)',
  },
  {
    id: 'warmOat',
    name: 'Warm Oat',
    base: '#EAE4DC',
    cozy: '#DFD8CE',
    card: '#F6F1EA',
    cardElevated: '#FCF8F3',
    isPro: false,
    isLight: true,
    label: 'Pastel (Free)',
  },
  {
    id: 'dustyRose',
    name: 'Dusty Rose',
    base: '#EADCE0',
    cozy: '#DFD0D5',
    card: '#F6EAEF',
    cardElevated: '#FCF3F7',
    isPro: true,
    isLight: true,
    label: 'Pastel (Pro)',
  },
  {
    id: 'softSage',
    name: 'Soft Sage',
    base: '#DCE6DF',
    cozy: '#CFDCD3',
    card: '#E9F2EC',
    cardElevated: '#F2F8F4',
    isPro: true,
    isLight: true,
    label: 'Pastel (Pro)',
  },
  {
    id: 'mutedLavender',
    name: 'Muted Lavender',
    base: '#E2DFEC',
    cozy: '#D6D2E2',
    card: '#ECE9F5',
    cardElevated: '#F5F2FB',
    isPro: true,
    isLight: true,
    label: 'Pastel (Pro)',
  },
  {
    id: 'mistySky',
    name: 'Misty Sky',
    base: '#DCE5EC',
    cozy: '#CFDBE4',
    card: '#E8F1F7',
    cardElevated: '#F1F7FC',
    isPro: true,
    isLight: true,
    label: 'Pastel (Pro)',
  },
  {
    id: 'softPeach',
    name: 'Soft Peach',
    base: '#EDE2D8',
    cozy: '#E2D6CB',
    card: '#F7ECE3',
    cardElevated: '#FCF3EB',
    isPro: true,
    isLight: true,
    label: 'Pastel (Pro)',
  },
];

export const APP_ACCENTS = [
  {
    id: 'gold',
    name: 'Gold',
    accent: '#FACC15',
    accentDark: '#D4A017',
    isPro: false,
    label: 'Free Default',
    textOnAccent: '#09090B',
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    accent: '#F472B6',
    accentDark: '#DB2777',
    isPro: true,
    label: 'Pro',
    textOnAccent: '#09090B',
  },
  {
    id: 'matcha',
    name: 'Matcha Green',
    accent: '#34D399',
    accentDark: '#059669',
    isPro: true,
    label: 'Pro',
    textOnAccent: '#09090B',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    accent: '#A78BFA',
    accentDark: '#7C3AED',
    isPro: true,
    label: 'Pro',
    textOnAccent: '#09090B',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    accent: '#38BDF8',
    accentDark: '#0284C7',
    isPro: true,
    label: 'Pro',
    textOnAccent: '#09090B',
  },
  {
    id: 'coral',
    name: 'Warm Coral',
    accent: '#FB923C',
    accentDark: '#EA580C',
    isPro: true,
    label: 'Pro',
    textOnAccent: '#09090B',
  },
];

// Backwards compatibility alias for theme pickers
export const APP_THEMES = APP_ACCENTS;

export function getBackgroundById(bgId) {
  return APP_BACKGROUNDS.find((b) => b.id === bgId) || APP_BACKGROUNDS[0];
}

export function getAccentById(accentId) {
  return APP_ACCENTS.find((a) => a.id === accentId) || APP_ACCENTS[0];
}

export function getThemeById(themeId) {
  return getAccentById(themeId);
}

/**
 * Generate full adaptive contrast tokens for any combination of Background + Accent + Cozy Dim mode.
 */
export function getAdaptiveTheme(bgId = 'midnight', accentId = 'gold', isCozy = false) {
  const bg = getBackgroundById(bgId);
  const acc = getAccentById(accentId);
  const isLight = bg.isLight;

  const screenBg = isCozy ? bg.cozy : bg.base;
  const cardBg = bg.card;
  const cardElevated = bg.cardElevated;

  return {
    id: `${bg.id}_${acc.id}${isCozy ? '_cozy' : ''}`,
    bgId: bg.id,
    accentId: acc.id,
    isCozy,
    isLight,

    // Surface tokens
    screenBg,
    cardBg,
    cardElevated,
    modalBg: isLight ? cardElevated : '#18181B',
    inputBg: isLight ? (isCozy ? '#D9D2C8' : '#E5DFD6') : '#27272A',
    inputBgElevated: isLight ? '#FFFFFF' : '#1F1F23',
    border: isLight ? '#D0C8BD' : '#2E2E32',
    borderSubtle: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
    overlay: isLight ? 'rgba(39, 37, 43, 0.45)' : 'rgba(0,0,0,0.65)',

    // Text tokens (high contrast & comfortable)
    textPrimary: isLight ? '#27252B' : '#FAFAFA',
    textSecondary: isLight ? '#6B6570' : '#A0A0A0',
    textMuted: isLight ? '#8E8894' : '#71717A',
    textOnAccent: acc.textOnAccent || '#09090B',

    // Accent tokens
    accent: acc.accent,
    accentDark: acc.accentDark,
    accentSubtle: acc.accent + (isLight ? '28' : '20'),

    // Navigation bar tokens
    tabBarBg: isLight ? cardBg : '#141417',
    tabBarBorder: isLight ? '#D0C8BD' : '#27272A',
    tabInactive: isLight ? '#7C7682' : '#71717A',
    statusBarStyle: isLight ? 'dark-content' : 'light-content',

    // Swipe to complete tokens
    swipeBg: isLight ? 'rgba(22, 163, 74, 0.16)' : 'rgba(34, 197, 94, 0.2)',
    swipeBorder: isLight ? '#15803D' : '#39FF14',
    swipeText: isLight ? '#15803D' : '#39FF14',

    // Priority badges
    priorityColors: {
      high: isLight ? '#DC2626' : '#EF4444',
      medium: isLight ? '#B45309' : '#FACC15',
      low: isLight ? '#2563EB' : '#38BDF8',
    },
    priorityBgs: {
      high: isLight ? 'rgba(220, 38, 38, 0.14)' : 'rgba(239, 68, 68, 0.22)',
      medium: isLight ? 'rgba(180, 83, 9, 0.14)' : 'rgba(250, 204, 21, 0.22)',
      low: isLight ? 'rgba(37, 99, 235, 0.14)' : 'rgba(56, 189, 248, 0.22)',
    },

    // Overdue badge
    overdueColor: isLight ? '#DC2626' : '#EF4444',
    overdueBg: isLight ? 'rgba(220, 38, 38, 0.14)' : 'rgba(239, 68, 68, 0.22)',

    // Common feedback colors
    success: isLight ? '#15803D' : '#22C55E',
    danger: isLight ? '#DC2626' : '#EF4444',
  };
}

// Fallback singleton COLORS export for static references
export const COLORS = {
  background: '#09090B',
  card: '#18181B',
  cardElevated: '#242428',
  accent: '#FACC15',
  accentDark: '#D4A017',
  text: '#FAFAFA',
  textSecondary: '#A0A0A0',
  textMuted: '#71717A',
  success: '#22C55E',
  successDark: '#16A34A',
  danger: '#EF4444',
  border: '#2E2E32',
  inputBg: '#27272A',
  overlay: 'rgba(0,0,0,0.6)',
  pendingCircle: '#444444',
  priorityHigh: '#EF4444',
  priorityMedium: '#FACC15',
  priorityLow: '#3B82F6',
  overdue: '#EF4444',
  overdueBg: 'rgba(239, 68, 68, 0.22)',
};

export const PRIORITY_CONFIG = {
  high: {
    label: 'High',
    shortLabel: 'HIGH',
    color: '#EF4444',
    bg: '#EF444422',
    weight: 3,
  },
  medium: {
    label: 'Medium',
    shortLabel: 'MED',
    color: '#FACC15',
    bg: '#FACC1522',
    weight: 2,
  },
  low: {
    label: 'Low',
    shortLabel: 'LOW',
    color: '#3B82F6',
    bg: '#3B82F622',
    weight: 1,
  },
};

export const TASK_ICONS = [
  { id: 'water', emoji: '💧', label: 'Water' },
  { id: 'study', emoji: '📚', label: 'Study' },
  { id: 'work', emoji: '💻', label: 'Work' },
  { id: 'health', emoji: '❤️', label: 'Health' },
  { id: 'workout', emoji: '🏋️', label: 'Workout' },
  { id: 'custom', emoji: '✨', label: 'Custom' },
];

export const REPEAT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
];

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};
