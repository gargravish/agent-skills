// Appearance setting: System (default — follows the device, per Apple's HIG),
// or pin Light / Dark. A three-way segmented control with real 44pt+ targets
// and radio semantics for VoiceOver.
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Sys, themedStyles } from '@/theme/system';
import { useResponsive } from '@/theme/responsive';
import { SysText } from '@/ui/System';
import { useTheme, type ThemePreference } from '@/store/theme';

const OPTIONS: { key: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { key: 'light', label: 'Light', icon: 'sunny-outline' },
  { key: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export default function AppearancePicker() {
  const r = useResponsive();
  const preference = useTheme((t) => t.preference);
  const setPreference = useTheme((t) => t.setPreference);
  const pending = useTheme((t) => t.pending);

  return (
    <View>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
        {OPTIONS.map((o) => {
          const active = o.key === preference;
          return (
            <Pressable
              key={o.key}
              onPress={() => { if (!active) setPreference(o.key); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${o.label} appearance`}
              style={({ pressed }) => [
                styles.seg,
                { minHeight: r.hitSize },
                active && styles.segActive,
                pressed && !active && { opacity: 0.7 },
              ]}>
              <Ionicons name={o.icon} size={r.isTablet ? 20 : 17} color={active ? Sys.color.onAccent : Sys.color.textDim} />
              <SysText size={14} weight="700" color={active ? Sys.color.onAccent : Sys.color.text}>{o.label}</SysText>
            </Pressable>
          );
        })}
      </View>
      <SysText faint size={12} style={{ marginTop: 8 }}>
        {pending
          ? `Switching to ${pending} as soon as you finish your current quiz.`
          : preference === 'system'
            ? 'Matches your device’s Light or Dark setting.'
            : `Always ${preference}, whatever your device is set to.`}
      </SysText>
    </View>
  );
}

const styles = themedStyles(() => StyleSheet.create({
  row: {
    flexDirection: 'row', gap: 6, padding: 4, borderRadius: Sys.radius.md,
    backgroundColor: Sys.color.surfaceAlt, borderWidth: 1, borderColor: Sys.color.border,
  },
  seg: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderRadius: Sys.radius.sm + 2, paddingHorizontal: 8,
  },
  segActive: { backgroundColor: Sys.color.primary },
}));
