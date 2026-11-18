import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, PRIORITY_CONFIG } from '../theme';
import {
  formatDateLabel,
  formatTime,
  calculateSubtaskProgress,
  isTaskOverdue,
} from '../utils';
import { triggerHaptic } from '../haptics';

export default function TaskDetailsModal({
  visible,
  task,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
  onUpdateSubtasks,
  onTestWakeUp,
  accentColor = COLORS.accent,
  theme,
}) {
  const accent = theme?.accent || accentColor;
  const modalBg = theme?.modalBg || COLORS.card;
  const cardBg = theme?.cardBg || COLORS.cardElevated;
  const border = theme?.border || COLORS.border;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;
  const inputBg = theme?.inputBg || COLORS.inputBg;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const scrollViewRef = useRef(null);

  const scrollToSubtasksBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        scrollToSubtasksBottom();
      }
    );
    return () => {
      showSub.remove();
    };
  }, []);

  if (!task) return null;

  const priority = task.priority || 'medium';
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const startDate = new Date(task.startDate || task.dateTime);
  const hasDueDate = Boolean(task.hasDueDate && task.dueDate);
  const dueDate = hasDueDate ? new Date(task.dueDate) : null;
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const progress = calculateSubtaskProgress(subtasks);
  const isOverdue = isTaskOverdue(task);

  // Toggle individual subtask
  const handleToggleSubtask = (subtaskId) => {
    triggerHaptic('light');
    const updated = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );

    // Check if this action made all subtasks complete
    const willBeAllDone =
      updated.length > 0 && updated.every((s) => s.completed);

    if (willBeAllDone && !task.completed) {
      triggerHaptic('success');
      onUpdateSubtasks(task.id, updated, true);
      Alert.alert(
        '🎉 All Subtasks Completed!',
        `All checklist items for "${task.title}" are done. The task has been marked complete!`
      );
    } else {
      onUpdateSubtasks(task.id, updated, false);
    }
  };

  // Add new subtask directly in details view
  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    triggerHaptic('light');

    const newItem = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
      title: trimmed,
      completed: false,
    };
    const updated = [...subtasks, newItem];
    setNewSubtaskTitle('');
    onUpdateSubtasks(task.id, updated, false);
    scrollToSubtasksBottom();
  };

  // Delete individual subtask
  const handleDeleteSubtask = (subtaskId) => {
    triggerHaptic('light');
    const updated = subtasks.filter((s) => s.id !== subtaskId);
    onUpdateSubtasks(task.id, updated, false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <TouchableOpacity
          style={styles.backdropHit}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheet, { backgroundColor: modalBg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View style={[styles.handle, { backgroundColor: border }]} />
            <View style={styles.headerRow}>
              <View style={styles.headerBadges}>
                {/* Overdue Badge */}
                {isOverdue && (
                  <View style={[styles.badgeOverdue, { backgroundColor: (theme?.overdueBg || COLORS.danger + '22'), borderColor: (theme?.overdueColor || COLORS.danger) }]}>
                    <Ionicons
                      name="alert-circle"
                      size={11}
                      color={theme?.overdueColor || COLORS.danger}
                    />
                    <Text style={[styles.badgeOverdueText, { color: theme?.overdueColor || COLORS.danger }]}>OVERDUE</Text>
                  </View>
                )}

                {/* Priority Badge */}
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: theme?.priorityBgs?.[priority] || priorityConfig.bg,
                      borderColor: theme?.priorityColors?.[priority] || priorityConfig.color,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeDot,
                      { backgroundColor: theme?.priorityColors?.[priority] || priorityConfig.color },
                    ]}
                  />
                  <Text
                    style={[styles.badgeText, { color: theme?.priorityColors?.[priority] || priorityConfig.color }]}
                  >
                    {priorityConfig.label}
                  </Text>
                </View>

                {/* Repeat Badge */}
                {task.repeat && task.repeat !== 'none' && (
                  <View style={[styles.badgeRepeat, { borderColor: accent + '55', backgroundColor: accent + '18' }]}>
                    <Ionicons name="repeat" size={11} color={accent} />
                    <Text style={[styles.badgeRepeatText, { color: accent }]}>
                      {task.repeat === 'daily' ? 'Daily' : 'Weekly'}
                    </Text>
                  </View>
                )}

                {/* Due Date Badge */}
                {hasDueDate && dueDate && (
                  <View
                    style={[
                      styles.badgeRepeat,
                      {
                        borderColor: isOverdue ? (theme?.overdueColor || COLORS.danger) : cardBg,
                        backgroundColor: isOverdue ? (theme?.overdueBg || COLORS.danger + '22') : (theme?.inputBg || cardBg),
                      },
                    ]}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={11}
                      color={isOverdue ? (theme?.overdueColor || COLORS.danger) : accent}
                    />
                    <Text
                      style={[
                        styles.badgeRepeatText,
                        { color: isOverdue ? (theme?.overdueColor || COLORS.danger) : textSecondary },
                      ]}
                    >
                      Due: {formatDateLabel(dueDate)}
                    </Text>
                  </View>
                )}

                {/* Wake-Up Guard Badge */}
                {task.wakeUpGuard && (
                  <View style={[styles.badgeRepeat, { borderColor: (theme?.danger || COLORS.danger) + '66', backgroundColor: (theme?.danger || COLORS.danger) + '1A' }]}>
                    <Ionicons name="eye" size={11} color={theme?.danger || COLORS.danger} />
                    <Text style={[styles.badgeRepeatText, { color: theme?.danger || COLORS.danger, fontWeight: '700' }]}>
                      Wake-Up Guard
                    </Text>
                  </View>
                )}

                {/* Status Badge */}
                <View
                  style={[
                    styles.badge,
                    task.completed
                      ? [styles.badgeCompleted, { borderColor: (theme?.success || COLORS.success) + '66', backgroundColor: (theme?.success || COLORS.success) + '18' }]
                      : [styles.badgePending, { borderColor: accent + '66', backgroundColor: accent + '18' }],
                  ]}
                >
                  <Ionicons
                    name={
                      task.completed
                        ? 'checkmark-circle'
                        : 'time-outline'
                    }
                    size={11}
                    color={
                      task.completed ? (theme?.success || COLORS.success) : accent
                    }
                  />
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: task.completed
                          ? (theme?.success || COLORS.success)
                          : accent,
                      },
                    ]}
                  >
                    {task.completed ? 'Done' : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: Edit, Delete, Close */}
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => {
                    onClose();
                    onEdit(task);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={20}
                    color={textSecondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => {
                    Alert.alert(
                      'Delete Task',
                      `Are you sure you want to delete "${task.title}"?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            onClose();
                            onDelete(task.id);
                          },
                        },
                      ]
                    );
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={COLORS.danger}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Scrollable details content */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title with Emoji Icon */}
            <View style={styles.titleRow}>
              {task.icon ? (
                <Text style={styles.titleEmoji}>{task.icon}</Text>
              ) : null}
              <Text
                style={[
                  styles.title,
                  { color: textPrimary },
                  task.completed && styles.titleCompleted,
                ]}
              >
                {task.title}
              </Text>
            </View>

            {/* Scheduled Start & Due Date Card */}
            <View style={[styles.scheduleCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.scheduleItem}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={accent}
                />
                <Text style={[styles.scheduleText, { color: textPrimary }]}>
                  Start: {formatDateLabel(startDate)} at {formatTime(startDate)}
                </Text>
              </View>

              {hasDueDate && dueDate && (
                <>
                  <View style={[styles.scheduleDivider, { backgroundColor: border, marginVertical: SPACING.xs }]} />
                  <View style={styles.scheduleItem}>
                    <Ionicons
                      name="flag-outline"
                      size={16}
                      color={isOverdue ? (theme?.overdueColor || COLORS.danger) : accent}
                    />
                    <Text
                      style={[
                        styles.scheduleText,
                        { color: textPrimary },
                        isOverdue && { color: (theme?.overdueColor || COLORS.danger), fontWeight: '700' },
                      ]}
                    >
                      Due: {formatDateLabel(dueDate)} at {formatTime(dueDate)}
                      {isOverdue ? ' (Overdue)' : ''}
                    </Text>
                  </View>
                </>
              )}

              {/* Reminder Row */}
              <View style={[styles.scheduleDivider, { backgroundColor: border, marginVertical: SPACING.xs }]} />
              <View style={styles.scheduleItem}>
                <Ionicons
                  name={task?.reminderMinutes === -1 ? 'notifications-off-outline' : 'notifications-outline'}
                  size={16}
                  color={accent}
                />
                <Text style={[styles.scheduleText, { color: textPrimary }]}>
                  Alert: {
                    task?.reminderMinutes === -1
                      ? 'No reminder (Silent)'
                      : task?.reminderMinutes === 0 || task?.reminderMinutes === undefined || task?.reminderMinutes === null
                      ? 'At task start time'
                      : task?.reminderMinutes === 60
                      ? '1 hour before start'
                      : `${task?.reminderMinutes} mins before start`
                  }
                </Text>
              </View>

              {/* Wake-Up Guard Alarm Info */}
              {task.wakeUpGuard && (
                <>
                  <View style={[styles.scheduleDivider, { backgroundColor: border, marginVertical: SPACING.xs }]} />
                  <View style={styles.scheduleItem}>
                    <Ionicons
                      name="eye"
                      size={16}
                      color={theme?.danger || COLORS.danger}
                    />
                    <Text style={[styles.scheduleText, { color: theme?.danger || COLORS.danger, fontWeight: '700' }]}>
                      Wake-Up Guard: 5-burst alarms + math puzzle
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Description / Notes */}
            <View style={styles.sectionBlock}>
              <Text style={[styles.sectionLabel, { color: textSecondary }]}>Notes & Description</Text>
              <View style={[styles.notesBox, { backgroundColor: cardBg, borderColor: border }]}>
                <Text style={[styles.notesText, { color: textPrimary }]}>
                  {task.description && task.description.trim()
                    ? task.description
                    : 'No additional notes provided.'}
                </Text>
              </View>
            </View>

            {/* Checklist / Subtasks Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.subtasksHeaderRow}>
                <Text style={[styles.sectionLabel, { color: textSecondary }]}>Checklist & Subtasks</Text>
                {progress.total > 0 && (
                  <Text style={[styles.progressCounter, { color: accent }]}>
                    {progress.completed}/{progress.total} done (
                    {progress.percentage}%)
                  </Text>
                )}
              </View>

              {/* Progress bar */}
              {progress.total > 0 && (
                <View style={[styles.progressBarBg, { backgroundColor: border }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(progress.percentage, 3)}%`,
                        backgroundColor: progress.allCompleted
                          ? (theme?.success || COLORS.success)
                          : accent,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Subtask list */}
              {subtasks.length > 0 ? (
                <View style={[styles.subtasksList, { backgroundColor: cardBg, borderColor: border }]}>
                  {subtasks.map((item, idx) => (
                    <View key={item.id || idx} style={[styles.subtaskRow, { borderBottomColor: border }]}>
                      <TouchableOpacity
                        style={styles.subtaskCheckHit}
                        onPress={() => handleToggleSubtask(item.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={
                            item.completed
                              ? 'checkmark-circle'
                              : 'ellipse-outline'
                          }
                          size={22}
                          color={
                            item.completed ? (theme?.success || COLORS.success) : textMuted
                          }
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.subtaskTitle,
                          { color: textPrimary },
                          item.completed && [styles.subtaskTitleDone, { color: textMuted }],
                        ]}
                        numberOfLines={3}
                      >
                        {item.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteSubtask(item.id)}
                        style={styles.subtaskDeleteHit}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={COLORS.danger + 'bb'}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptySubtasksText, { color: textMuted }]}>
                  No subtasks yet. Add items below to track step-by-step
                  progress.
                </Text>
              )}

              {/* Quick Add Subtask Input */}
              <View style={styles.addSubtaskRow}>
                <TextInput
                  style={[styles.addSubtaskInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
                  placeholder="Add a new checklist item..."
                  placeholderTextColor={textMuted}
                  value={newSubtaskTitle}
                  onChangeText={setNewSubtaskTitle}
                  onFocus={scrollToSubtasksBottom}
                  onSubmitEditing={handleAddSubtask}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.addSubtaskBtn, { backgroundColor: accent }]}
                  onPress={handleAddSubtask}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color={textOnAccent} />
                  <Text style={[styles.addSubtaskBtnText, { color: textOnAccent }]}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Complete / Toggle Button */}
            <TouchableOpacity
              style={[
                styles.mainActionBtn,
                task.completed
                  ? [styles.mainActionBtnUndo, { backgroundColor: cardBg, borderColor: border }]
                  : [styles.mainActionBtnComplete, { backgroundColor: accent }],
              ]}
              onPress={() => {
                triggerHaptic(task.completed ? 'light' : 'success');
                onToggleComplete(task.id);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name={
                  task.completed
                    ? 'arrow-undo-outline'
                    : 'checkmark-circle'
                }
                size={20}
                color={task.completed ? accent : textOnAccent}
              />
              <Text
                style={[
                  styles.mainActionBtnText,
                  { color: task.completed ? accent : textOnAccent },
                ]}
              >
                {task.completed
                  ? 'Mark as Incomplete'
                  : 'Mark Task Complete'}
              </Text>
            </TouchableOpacity>

            {/* Test Wake-Up Challenge Button */}
            {task.wakeUpGuard && onTestWakeUp && (
              <TouchableOpacity
                style={[
                  styles.testWakeUpBtn,
                  {
                    backgroundColor: (theme?.danger || COLORS.danger) + '15',
                    borderColor: theme?.danger || COLORS.danger,
                  },
                ]}
                onPress={() => {
                  triggerHaptic('medium');
                  onClose();
                  onTestWakeUp(task);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="eye-outline" size={18} color={theme?.danger || COLORS.danger} />
                <Text style={[styles.testWakeUpBtnText, { color: theme?.danger || COLORS.danger }]}>
                  Test Wake-Up Challenge Screen
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.overlay,
  },
  backdropHit: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '88%',
    minHeight: 460,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 4,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  badgeOverdue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.danger + '22',
    gap: 3,
  },
  badgeOverdueText: {
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
    color: COLORS.danger,
    letterSpacing: 0.5,
  },
  badgeRepeat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.accent + '66',
    backgroundColor: COLORS.accent + '22',
    gap: 3,
  },
  badgeRepeatText: {
    fontSize: 10,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.accent,
  },
  badgeCompleted: {
    backgroundColor: COLORS.success + '22',
    borderColor: COLORS.success,
  },
  badgePending: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconBtn: {
    padding: SPACING.xs,
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  titleEmoji: {
    fontSize: 26,
  },
  title: {
    flex: 1,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 28,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  scheduleDivider: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.border,
  },
  scheduleText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  sectionBlock: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs + 2,
  },
  notesBox: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCounter: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.accent,
    fontWeight: FONTS.weights.semibold,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  subtasksList: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '33',
  },
  subtaskCheckHit: {
    marginRight: SPACING.sm,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  subtaskTitleDone: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  subtaskDeleteHit: {
    paddingLeft: SPACING.sm,
  },
  emptySubtasksText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginVertical: SPACING.xs,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  addSubtaskInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  addSubtaskBtnText: {
    color: '#121212',
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  mainActionBtnComplete: {
    backgroundColor: COLORS.accent,
  },
  mainActionBtnUndo: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  mainActionBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#121212',
  },
  testWakeUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  testWakeUpBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
});
