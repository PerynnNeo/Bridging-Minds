export const colors = {
  background: '#F7F7F9', // off-white, calm
  surface: '#FFFFFF',
  surfaceAlt: '#f9f7f0', // iOS grouped background
  textPrimary: '#0A0A0A',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  accent: '#687d67', // iOS blue
  accentAlt: '#334155', // slate
  success: '#34C759',
  warning: '#FF9F0A',
  danger: '#FF453A',
  mutedCoral: '#E66A5A', // subtle coral accent
  divider: '#E5E7EB',
  shadow: 'rgba(0,0,0,0.06)'
};

export const radii = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32
};

export const typography = {
  titleLarge: { fontSize: 28, fontWeight: '800', letterSpacing: -0.2 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.1 },
  subtitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '500' },
  caption: { fontSize: 12, fontWeight: '500' }
};

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  }
};

export const theme = { colors, radii, spacing, typography, shadows };


