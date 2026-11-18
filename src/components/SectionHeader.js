import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

/**
 * Collapsible section header with item count badge and chevron toggle.
 */
export default function SectionHeader({
  title,
  count,
  expanded,
  onToggle,
  iconName,
  iconColor,
  theme,
}) {
  const textColor = theme?.textSecondary || COLORS.textSecondary;
  const badgeBg = theme?.isLight ? theme.border : COLORS.border;
  const badgeTextColor = theme?.textPrimary || COLORS.text;
  const iconC = iconColor || theme?.accent || COLORS.textSecondary;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <View style={styles.left}>
        {iconName && (
          <Ionicons
            name={iconName}
            size={16}
            color={iconC}
            style={styles.icon}
          />
        )}
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {count > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeTextColor }]}>{count}</Text>
          </View>
        )}
      </View>
      <Ionicons
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={textColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: SPACING.sm,
  },
  title: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badge: {
    borderRadius: RADIUS.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
});
