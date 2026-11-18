import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { getCurrentWeekDays, DAY_LABELS, formatDateKey } from '../utils';

export default function WeekCalendarStrip({
  selectedDateKey,
  onSelectDate,
  accentColor = COLORS.accent,
  theme,
}) {
  const weekDays = getCurrentWeekDays();
  const todayKey = formatDateKey(new Date());

  const containerBg = theme?.cardBg || COLORS.card;
  const containerBorder = theme?.border || COLORS.border;
  const accent = theme?.accent || accentColor;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: containerBg, borderBottomColor: containerBorder }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {weekDays.map((day, index) => {
          const dateKey = formatDateKey(day);
          const isSelected = dateKey === selectedDateKey;
          const isToday = dateKey === todayKey;

          return (
            <TouchableOpacity
              key={dateKey}
              style={[
                styles.dayCell,
                isSelected && [styles.dayCellSelected, { backgroundColor: accent }],
                isToday && !isSelected && [styles.dayCellToday, { borderColor: accent }],
              ]}
              onPress={() => onSelectDate(dateKey)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayLabel,
                  { color: textSecondary },
                  isSelected && [styles.dayLabelSelected, { color: textOnAccent }],
                  isToday && !isSelected && [styles.dayLabelToday, { color: accent }],
                ]}
              >
                {DAY_LABELS[index]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  { color: textPrimary },
                  isSelected && [styles.dayNumberSelected, { color: textOnAccent }],
                  isToday && !isSelected && [styles.dayNumberToday, { color: accent }],
                ]}
              >
                {day.getDate()}
              </Text>
              {isToday && (
                <View
                  style={[
                    styles.todayDot,
                    isSelected ? [styles.todayDotSelected, { backgroundColor: textOnAccent }] : { backgroundColor: accent },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  strip: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 64,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
  },
  dayCellSelected: {},
  dayCellToday: {
    borderWidth: 1,
  },
  dayLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
    marginBottom: 2,
  },
  dayLabelSelected: {
    fontWeight: FONTS.weights.bold,
  },
  dayLabelToday: {},
  dayNumber: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  dayNumberSelected: {
    fontWeight: FONTS.weights.bold,
  },
  dayNumberToday: {},
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.full,
    marginTop: 3,
  },
  todayDotSelected: {},
});
