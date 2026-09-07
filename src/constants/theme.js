export const COLORS = {
  // Option C: Emerald Sovereign Green & Royal Saffron Gold Palette
  primary: '#004D2C',       // Rich national green
  primaryLight: '#006B3C',  // Medium leaf green
  primaryDark: '#00361F',   // Deep sovereign green
  primaryPale: '#EBF4EF',   // Very soft green tint

  // Gold Accents (Prestige & Official Emblem feel)
  gold: '#BFA050',          // Royal brushed gold
  goldDark: '#9E8036',      // Deep antique gold
  goldLight: '#D8BC6B',     // Highlight gold
  goldPale: '#FBF7ED',      // Light cream gold tint

  // Functional Statuses
  present: '#15803D',       // Attendance Present green
  presentPale: '#DCFCE7',
  absent: '#C2410C',        // Attendance Absent warm crimson/amber
  absentPale: '#FFEDD5',
  warning: '#D97706',
  error: '#DC2626',
  success: '#16A34A',

  // Neutrals & Surfaces (Warm Cream Tone)
  white: '#FFFFFF',
  cream: '#F4EDE4',         // Rich warm cream background
  creamCard: '#FAF5EC',     // Soft cream surface
  creamBorder: '#DECFA9',   // Warm subtle border
  background: '#F4EDE4',    // Warm cream background
  cardBg: '#FAF5EC',        // Cream card surface
  border: '#DECFA9',
  borderLight: '#E8DEC8',
  divider: '#E5DCCE',

  // Text Hierarchy
  textDark: '#12231A',      // High contrast deep charcoal-green
  textMedium: '#475C51',    // Readability balanced muted text
  textLight: '#82958B',     // Subtle helper text
  textWhite: '#FFFFFF',

  // Offline / Sync Status Badges
  offlineBg: '#FEF3C7',
  offlineBorder: '#F59E0B',
  offlineText: '#92400E',
  syncedBg: '#DCFCE7',
  syncedBorder: '#22C55E',
  syncedText: '#15803D',
};

export const SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 21,
  xxl: 25,
  xxxl: 32,

  // Spacing
  paddingXs: 6,
  paddingSm: 10,
  paddingMd: 16,
  paddingLg: 22,
  paddingXl: 28,

  // Radii
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#002B19',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#002B19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#002B19',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
};
