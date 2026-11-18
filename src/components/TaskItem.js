import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, PRIORITY_CONFIG } from '../theme';
import {
  formatTime,
  formatDateLabel,
  calculateSubtaskProgress,
  isTaskOverdue,
} from '../utils';
import { triggerHaptic } from '../haptics';

export default function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
  onPressTask,
  accentColor = COLORS.accent,
  theme,
}) {
  const priority = task.priority || 'medium';
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const startDate = new Date(task.startDate || task.dateTime);
  const hasDueDate = Boolean(task.hasDueDate && task.dueDate);
  const dueDate = hasDueDate ? new Date(task.dueDate) : null;
  const isOverdue = isTaskOverdue(task);

  // Dynamic contrast tokens
  const accent = theme?.accent || accentColor;
  const cardBg = theme?.cardBg || COLORS.card;
  const cardBorder = theme?.border || COLORS.border;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;
  const swipeBg = theme?.swipeBg || 'rgba(34, 197, 94, 0.2)';
  const swipeBorder = theme?.swipeBorder || '#39FF14';
  const swipeText = theme?.swipeText || '#39FF14';

  const priorityColor = theme?.priorityColors?.[priority] || priorityConfig.color;
  const priorityBg = theme?.priorityBgs?.[priority] || priorityConfig.bg;
  const overdueColor = theme?.overdueColor || COLORS.danger;
  const overdueBg = theme?.overdueBg || COLORS.danger + '22';

  // Subtask progress
  const subtaskProgress = calculateSubtaskProgress(task.subtasks);

  // PanResponder & Animated setup for Swipe to Complete
  const panX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 95;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (task.completed) return false;
        return (
          gestureState.dx > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 1.5)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (task.completed) return;
        if (gestureState.dx > 0) {
          panX.setValue(Math.min(gestureState.dx, 160));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (task.completed) return;
        if (gestureState.dx >= SWIPE_THRESHOLD) {
          triggerHaptic('success');
          Animated.timing(panX, {
            toValue: 380,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onToggle(task.id);
            panX.setValue(0);
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleLongPress = () => {
    Alert.alert(
      task.title,
      'What would you like to do?',
      [
        {
          text: 'View Details',
          onPress: () => onPressTask && onPressTask(task),
        },
        {
          text: 'Edit',
          onPress: () => onEdit(task),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Task',
              `Are you sure you want to delete "${task.title}"?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(task.id),
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const checkmarkScale = panX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0.7, 1.15],
    extrapolate: 'clamp',
  });

  const swipeOpacity = panX.interpolate({
    inputRange: [0, 15, SWIPE_THRESHOLD],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  const panHandlers = !task.completed ? panResponder.panHandlers : {};

  return (
    <View style={styles.wrapper}>
      {/* Background revealed during right swipe */}
      {!task.completed && (
        <Animated.View
          style={[
            styles.swipeBackground,
            {
              backgroundColor: swipeBg,
              borderColor: swipeBorder,
              opacity: swipeOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.swipeActionContent,
              { transform: [{ scale: checkmarkScale }] },
            ]}
          >
            <Ionicons name="checkmark-circle" size={26} color={swipeText} />
            <Text style={[styles.swipeActionText, { color: swipeText }]}>Complete</Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Swipeable foreground card */}
      <Animated.View
        style={[
          styles.animatedCard,
          { backgroundColor: cardBg },
          !task.completed && { transform: [{ translateX: panX }] },
        ]}
        {...panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.container,
            {
              backgroundColor: cardBg,
              borderColor: cardBorder,
              borderLeftColor: isOverdue ? overdueColor : priorityColor,
              borderLeftWidth: 4,
            },
            task.completed && styles.containerCompleted,
          ]}
          onPress={() => {
            if (onPressTask) {
              onPressTask(task);
            }
          }}
          onLongPress={handleLongPress}
          activeOpacity={0.8}
          delayLongPress={350}
        >
          {/* Explicit checkbox toggle with haptics */}
          <TouchableOpacity
            style={[
              styles.checkbox,
              { borderColor: theme?.isLight ? cardBorder : COLORS.pendingCircle },
              task.completed && { backgroundColor: theme?.success || COLORS.success, borderColor: theme?.success || COLORS.success },
            ]}
            onPress={() => {
              triggerHaptic(task.completed ? 'light' : 'success');
              onToggle(task.id);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {task.completed && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* Left Category Emoji Icon */}
          {task.icon ? (
            <View style={styles.iconContainer}>
              <Text style={styles.taskEmoji}>{task.icon}</Text>
            </View>
          ) : null}

          {/* Task main content */}
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.title,
                  { color: textPrimary },
                  task.completed && styles.titleCompleted,
                ]}
                numberOfLines={1}
              >
                {task.title}
              </Text>

              {/* Badges: Overdue & Priority */}
              <View style={styles.badgesContainer}>
                {isOverdue && (
                  <View style={[styles.overdueBadge, { backgroundColor: overdueBg, borderColor: overdueColor }]}>
                    <Ionicons
                      name="alert-circle"
                      size={10}
                      color={overdueColor}
                    />
                    <Text style={[styles.overdueBadgeText, { color: overdueColor }]}>OVERDUE</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: priorityBg,
                      borderColor: priorityColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityBadgeText,
                      { color: priorityColor },
                    ]}
                  >
                    {priorityConfig.shortLabel}
                  </Text>
                </View>
              </View>
            </View>

            {task.description ? (
              <Text
                style={[
                  styles.description,
                  { color: textSecondary },
                  task.completed && styles.descriptionCompleted,
                ]}
                numberOfLines={1}
              >
                {task.description}
              </Text>
            ) : null}

            {/* Meta row: Date, Time, Due Date, Repeat, and Subtask Progress badge */}
            <View style={styles.meta}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={isOverdue && !hasDueDate ? overdueColor : textMuted}
                style={styles.metaIcon}
              />
              <Text
                style={[
                  styles.metaText,
                  { color: textMuted },
                  isOverdue && !hasDueDate && { color: overdueColor, fontWeight: '600' },
                ]}
              >
                {formatDateLabel(startDate)}
              </Text>

              <Ionicons
                name="time-outline"
                size={12}
                color={textMuted}
                style={[styles.metaIcon, { marginLeft: SPACING.sm }]}
              />
              <Text style={[styles.metaText, { color: textMuted }]}>{formatTime(startDate)}</Text>

              {/* Optional Due Date / Deadline Badge */}
              {hasDueDate && dueDate && (
                <View
                  style={[
                    styles.dueBadge,
                    {
                      backgroundColor: isOverdue ? overdueBg : (theme?.inputBg || COLORS.inputBg),
                      borderColor: isOverdue ? overdueColor : cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="flag-outline"
                    size={11}
                    color={isOverdue ? overdueColor : accent}
                  />
                  <Text
                    style={[
                      styles.dueBadgeText,
                      { color: isOverdue ? overdueColor : textSecondary },
                    ]}
                  >
                    Due: {formatDateLabel(dueDate)} {formatTime(dueDate)}
                  </Text>
                </View>
              )}

              {/* Recurring Badge */}
              {task.repeat && task.repeat !== 'none' && (
                <View
                  style={[
                    styles.repeatBadge,
                    { borderColor: accent + '44', backgroundColor: accent + '15' },
                  ]}
                >
                  <Ionicons name="repeat" size={11} color={accent} />
                  <Text style={[styles.repeatBadgeText, { color: accent }]}>
                    {task.repeat === 'daily' ? 'Daily' : 'Weekly'}
                  </Text>
                </View>
              )}

              {/* Reminder Indicator */}
              {task.reminderMinutes === -1 && (
                <View
                  style={[
                    styles.repeatBadge,
                    { borderColor: cardBorder, backgroundColor: 'transparent' },
                  ]}
                >
                  <Ionicons name="notifications-off-outline" size={11} color={textMuted} />
                </View>
              )}
              {task.reminderMinutes > 0 && (
                <View
                  style={[
                    styles.repeatBadge,
                    { borderColor: accent + '44', backgroundColor: accent + '12' },
                  ]}
                >
                  <Ionicons name="notifications-outline" size={10} color={accent} />
                  <Text style={[styles.repeatBadgeText, { color: accent, marginLeft: 2 }]}>
                    {task.reminderMinutes}m
                  </Text>
                </View>
              )}

              {/* Wake-Up Guard (Heavy Sleeper) Badge */}
              {task.wakeUpGuard && (
                <View
                  style={[
                    styles.repeatBadge,
                    {
                      borderColor: (theme?.danger || COLORS.danger) + '66',
                      backgroundColor: (theme?.danger || COLORS.danger) + '1A',
                    },
                  ]}
                >
                  <Ionicons name="eye" size={11} color={theme?.danger || COLORS.danger} />
                  <Text
                    style={[
                      styles.repeatBadgeText,
                      { color: theme?.danger || COLORS.danger, fontWeight: '700', marginLeft: 2 },
                    ]}
                  >
                    Alarm
                  </Text>
                </View>
              )}

              {/* Subtasks Progress Badge */}
              {subtaskProgress.total > 0 && (
                <View
                  style={[
                    styles.subtaskBadge,
                    {
                      backgroundColor: theme?.inputBg || COLORS.inputBg,
                      borderColor: cardBorder,
                    },
                    subtaskProgress.allCompleted && styles.subtaskBadgeDone,
                  ]}
                >
                  <Ionicons
                    name={
                      subtaskProgress.allCompleted
                        ? 'checkbox'
                        : 'list-circle-outline'
                    }
                    size={13}
                    color={
                      subtaskProgress.allCompleted
                        ? (theme?.success || COLORS.success)
                        : accent
                    }
                    style={{ marginRight: 3 }}
                  />
                  <Text
                    style={[
                      styles.subtaskBadgeText,
                      { color: accent },
                      subtaskProgress.allCompleted && styles.subtaskBadgeTextDone,
                    ]}
                  >
                    {subtaskProgress.completed}/{subtaskProgress.total}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onEdit(task)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="pencil-outline"
                size={16}
                color={textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                Alert.alert(
                  'Delete Task',
                  `Are you sure you want to delete "${task.title}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => onDelete(task.id),
                    },
                  ]
                );
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={COLORS.danger}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.sm,
    position: 'relative',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  swipeBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
    paddingLeft: SPACING.lg,
  },
  swipeActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  swipeActionText: {
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
    letterSpacing: 0.5,
  },
  animatedCard: {
    borderRadius: RADIUS.lg,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  containerCompleted: {
    opacity: 0.65,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    flexShrink: 0,
  },
  iconContainer: {
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskEmoji: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  title: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    fontWeight: FONTS.weights.regular,
    opacity: 0.6,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: SPACING.xs,
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  overdueBadgeText: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: FONTS.sizes.sm,
    marginBottom: SPACING.xs,
  },
  descriptionCompleted: {
    opacity: 0.6,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
  },
  metaIcon: {
    marginRight: 3,
  },
  metaText: {
    fontSize: FONTS.sizes.xs,
  },
  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: SPACING.sm,
    gap: 2,
  },
  repeatBadgeText: {
    fontSize: 9,
    fontWeight: FONTS.weights.semibold,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    marginLeft: SPACING.sm,
    gap: 3,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weights.semibold,
  },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: SPACING.sm,
    borderWidth: 1,
  },
  subtaskBadgeDone: {
    borderColor: 'rgba(22, 163, 74, 0.4)',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  subtaskBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
  },
  subtaskBadgeTextDone: {
    color: '#15803D',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  actionBtn: {
    padding: SPACING.xs,
  },
});
