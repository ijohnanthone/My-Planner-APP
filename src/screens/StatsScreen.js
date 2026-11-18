import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, PRIORITY_CONFIG } from '../theme';

export default function StatsScreen({ tasks, accentColor = COLORS.accent, theme }) {
  const accent = theme?.accent || accentColor;
  const screenBg = theme?.screenBg || COLORS.background;
  const cardBg = theme?.cardBg || COLORS.card;
  const cardElevated = theme?.cardElevated || COLORS.cardElevated;
  const border = theme?.border || COLORS.border;
  const inputBg = theme?.inputBg || COLORS.inputBg;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Breakdown by priority
  const highTasks = tasks.filter((t) => t.priority === 'high');
  const mediumTasks = tasks.filter((t) => (t.priority || 'medium') === 'medium');
  const lowTasks = tasks.filter((t) => t.priority === 'low');

  const highCompleted = highTasks.filter((t) => t.completed).length;
  const mediumCompleted = mediumTasks.filter((t) => t.completed).length;
  const lowCompleted = lowTasks.filter((t) => t.completed).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>Productivity Stats</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          100% Offline performance & task analytics
        </Text>
      </View>

      {/* Completion Banner / Circle Card */}
      <View style={[styles.bannerCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.bannerLeft}>
          <Text style={[styles.bannerPercentage, { color: accent }]}>{completionPercentage}%</Text>
          <Text style={[styles.bannerLabel, { color: textSecondary }]}>Completed</Text>
          <View style={[styles.progressBarBackground, { backgroundColor: inputBg }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.max(completionPercentage, 3)}%`, backgroundColor: accent },
              ]}
            />
          </View>
        </View>

        <View style={styles.bannerRight}>
          <Ionicons
            name={
              completionPercentage >= 80
                ? 'trophy'
                : completionPercentage >= 50
                ? 'trending-up'
                : 'sparkles'
            }
            size={48}
            color={accent}
          />
        </View>
      </View>

      {/* Metric Cards Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.metricCardCompleted, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="checkmark-circle" size={24} color={theme?.success || COLORS.success} />
          </View>
          <Text style={[styles.metricNumber, { color: textPrimary }]}>{completedTasks}</Text>
          <Text style={[styles.metricLabel, { color: textSecondary }]}>Completed</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardPending, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="time" size={24} color={accent} />
          </View>
          <Text style={[styles.metricNumber, { color: textPrimary }]}>{pendingTasks}</Text>
          <Text style={[styles.metricLabel, { color: textSecondary }]}>Pending</Text>
        </View>

        <View style={[styles.metricCard, styles.metricCardTotal, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="layers" size={24} color="#60A5FA" />
          </View>
          <Text style={[styles.metricNumber, { color: textPrimary }]}>{totalTasks}</Text>
          <Text style={[styles.metricLabel, { color: textSecondary }]}>Total Tasks</Text>
        </View>
      </View>

      {/* Priority Breakdown Card */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flag" size={18} color={accent} />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Priority Breakdown</Text>
        </View>

        {/* High Priority */}
        <View style={styles.priorityItem}>
          <View style={styles.priorityHeader}>
            <View style={styles.priorityLabelRow}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: PRIORITY_CONFIG.high.color },
                ]}
              />
              <Text style={styles.priorityName}>High Priority</Text>
            </View>
            <Text style={styles.priorityCountText}>
              {highCompleted} / {highTasks.length} done
            </Text>
          </View>
          <View style={styles.priorityBarBg}>
            <View
              style={[
                styles.priorityBarFill,
                {
                  backgroundColor: PRIORITY_CONFIG.high.color,
                  width: `${
                    highTasks.length > 0
                      ? Math.round((highCompleted / highTasks.length) * 100)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Medium Priority */}
        <View style={styles.priorityItem}>
          <View style={styles.priorityHeader}>
            <View style={styles.priorityLabelRow}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: PRIORITY_CONFIG.medium.color },
                ]}
              />
              <Text style={styles.priorityName}>Medium Priority</Text>
            </View>
            <Text style={styles.priorityCountText}>
              {mediumCompleted} / {mediumTasks.length} done
            </Text>
          </View>
          <View style={styles.priorityBarBg}>
            <View
              style={[
                styles.priorityBarFill,
                {
                  backgroundColor: PRIORITY_CONFIG.medium.color,
                  width: `${
                    mediumTasks.length > 0
                      ? Math.round((mediumCompleted / mediumTasks.length) * 100)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Low Priority */}
        <View style={styles.priorityItem}>
          <View style={styles.priorityHeader}>
            <View style={styles.priorityLabelRow}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: PRIORITY_CONFIG.low.color },
                ]}
              />
              <Text style={styles.priorityName}>Low Priority</Text>
            </View>
            <Text style={styles.priorityCountText}>
              {lowCompleted} / {lowTasks.length} done
            </Text>
          </View>
          <View style={styles.priorityBarBg}>
            <View
              style={[
                styles.priorityBarFill,
                {
                  backgroundColor: PRIORITY_CONFIG.low.color,
                  width: `${
                    lowTasks.length > 0
                      ? Math.round((lowCompleted / lowTasks.length) * 100)
                      : 0
                  }%`,
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Motivational / Status summary */}
      <View style={styles.motivationCard}>
        <Ionicons name="shield-checkmark" size={22} color={COLORS.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.motivationTitle}>Local Storage Only</Text>
          <Text style={styles.motivationSub}>
            All tasks and statistics are stored securely and privately on this device.
          </Text>
        </View>
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  bannerLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  bannerPercentage: {
    fontSize: 44,
    fontWeight: FONTS.weights.bold,
    color: COLORS.accent,
  },
  bannerLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
  },
  bannerRight: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricCardCompleted: {
    borderTopWidth: 3,
    borderTopColor: COLORS.success,
  },
  metricCardPending: {
    borderTopWidth: 3,
    borderTopColor: COLORS.accent,
  },
  metricCardTotal: {
    borderTopWidth: 3,
    borderTopColor: '#60A5FA',
  },
  metricIconWrap: {
    marginBottom: SPACING.xs,
  },
  metricNumber: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  priorityItem: {
    marginBottom: SPACING.md,
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  priorityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  priorityName: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  priorityCountText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  priorityBarBg: {
    height: 6,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  priorityBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  motivationTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  motivationSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
