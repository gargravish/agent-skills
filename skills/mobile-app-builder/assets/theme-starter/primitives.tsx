// Reusable "System" UI primitives in the MathMonarch dark aesthetic.
//
// These three primitives render nearly every pixel in the app, so they are also
// where responsiveness lives: each one reads useResponsive() and scales its own
// type, padding and hit area. That means a screen gets iPad-correct typography
// and touch targets for free, and only has to think about its column layout.
import React from 'react';
import {
  Text, View, Pressable, StyleSheet, ActivityIndicator,
  type ViewStyle, type TextStyle, type StyleProp,
} from 'react-native';
import { Sys, themedStyles } from '../theme/system';
import { useResponsive } from '../theme/responsive';

export function SysText({
  children, style, dim, faint, size = 15, weight = '500', color, numberOfLines, onPress,
}: {
  children: React.ReactNode; style?: StyleProp<TextStyle>;
  dim?: boolean; faint?: boolean; size?: number; weight?: TextStyle['fontWeight']; color?: string;
  numberOfLines?: number; onPress?: () => void;
}) {
  const r = useResponsive();
  // A tappable line of text is a control: pressRetentionOffset keeps the touch
  // alive if the finger drifts, and callers give link-style text real padding
  // (RN's Text has no hitSlop, so the hit area comes from layout, not props).
  return (
    <Text
      onPress={onPress}
      numberOfLines={numberOfLines}
      pressRetentionOffset={onPress ? { top: 8, bottom: 8, left: 8, right: 8 } : undefined}
      style={[
        {
          color: color ?? (faint ? Sys.color.textFaint : dim ? Sys.color.textDim : Sys.color.text),
          fontSize: r.font(size),
          fontWeight: weight,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

export function SysCard({ children, style, glow }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; glow?: boolean }) {
  const r = useResponsive();
  return (
    <View style={[styles.card, { padding: r.space(Sys.space.md), borderRadius: r.isTablet ? Sys.radius.xl : Sys.radius.lg }, glow && styles.cardGlow, style]}>
      {children}
    </View>
  );
}

export function SysButton({
  label, onPress, loading, disabled, variant = 'primary', style,
}: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'gold' | 'ghost' | 'danger'; style?: StyleProp<ViewStyle>;
}) {
  const r = useResponsive();
  const bg = variant === 'primary' ? Sys.color.primary
    : variant === 'gold' ? Sys.color.gold
    : variant === 'danger' ? Sys.color.danger
    : 'transparent';
  const fg = variant === 'ghost' ? Sys.color.text : Sys.color.onAccent;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        // minHeight (not height) so a label that wraps at large text sizes grows
        // the button instead of being clipped.
        { minHeight: r.isTablet ? 60 : 52, paddingHorizontal: r.space(Sys.space.lg) },
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && styles.btnGhost,
        style,
      ]}>
      {loading
        ? <ActivityIndicator color={fg} />
        : <Text style={[styles.btnLabel, { color: fg, fontSize: r.font(16) }]}>{label}</Text>}
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = themedStyles(() => StyleSheet.create({
  card: {
    backgroundColor: Sys.color.surface,
    borderWidth: 1,
    borderColor: Sys.color.border,
  },
  cardGlow: {
    borderColor: Sys.color.borderGlow,
    shadowColor: Sys.color.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  btn: {
    borderRadius: Sys.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  btnGhost: { borderWidth: 1, borderColor: Sys.color.border },
  btnLabel: { fontWeight: '700', letterSpacing: 0.3, textAlign: 'center' },
  divider: { height: 1, backgroundColor: Sys.color.border, marginVertical: Sys.space.md },
}));
