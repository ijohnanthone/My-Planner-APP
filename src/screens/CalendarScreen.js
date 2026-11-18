import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import {
  DAY_LABELS,
  toLocalDateKey,
  formatDateKey,
  formatDateLabel,
  parseLocalDateKey,
  getMonthYearLabel,
  getCalendarGridDays,
  getDatesWithTasks,
  filterTasksByDate,
  sortTasksByDateTime,
} from '../utils';
import TaskItem from '../components/TaskItem';

export default function CalendarScreen({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddNewTaskForDate,
  onPressTask,
  selectedDateKey: controlledDateKey,
  onSelectDateKey,
  accentColor = COLORS.accent,
  theme,
}) {
  const accent = theme?.accent || accentColor;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const screenBg = theme?.screenBg || COLORS.background;
  const cardBg = theme?.cardBg || COLORS.card;
  const border = theme?.border || COLORS.border;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;

  const today = new Date();
  const [internalDateKey, setInternalDateKey] = useState(toLocalDateKey(today));
  const activeDateKey = controlledDateKey || internalDateKey;

  const activeDateObj = parseLocalDateKey(activeDateKey);
  const [currentYear, setCurrentYear] = useState(activeDateObj.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(activeDateObj.getMonth());

  // Keep month view synchronized when controlled date changes
  useEffect(() => {
    if (controlledDateKey) {
      const d = parseLocalDateKey(controlledDateKey);
      setCurrentYear(d.getFullYear());
      setCurrentMonth(d.getMonth());
    }
  }, [controlledDateKey]);

  const gridDays = getCalendarGridDays(currentYear, currentMonth);
  const datesWithTasks = getDatesWithTasks(tasks);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (dateKey) => {
    if (onSelectDateKey) {
      onSelectDateKey(dateKey);
    }
    setInternalDateKey(dateKey);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    handleSelectDate(toLocalDateKey(now));
  };

  // Tasks for the selected date
  const selectedDayTasks = sortTasksByDateTime(
    filterTasksByDate(tasks, activeDateKey)
  );

  const selectedDateObj = parseLocalDateKey(activeDateKey);
  const isSelectedToday = activeDateKey === toLocalDateKey(new Date());

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Month Navigation Header */}
      <View style={styles.navHeader}>
        <View>
          <Text style={[styles.monthTitle, { color: textPrimary }]}>
            {getMonthYearLabel(currentYear, currentMonth)}
          </Text>
          <TouchableOpacity onPress={goToToday} style={styles.todayBtn}>
            <Text style={[styles.todayBtnText, { color: accent }]}>Go to Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navArrows}>
          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: cardBg, borderColor: border }]}
            onPress={prevMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: cardBg, borderColor: border }]}
            onPress={nextMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={20} color={textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Grid Card */}
      <View style={[styles.calendarCard, { backgroundColor: cardBg, borderColor: border }]}>
        {/* Day-of-week row */}
        <View style={[styles.weekdayRow, { borderBottomColor: border }]}>
          {DAY_LABELS.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayText,
                  { color: textSecondary },
                  (index === 0 || index === 6) && styles.weekendText,
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar days grid */}
        <View style={styles.daysGrid}>
          {gridDays.map((cell) => {
            const isSelected = cell.dateKey === activeDateKey;
            const hasTasks = datesWithTasks.has(cell.dateKey);

            return (
              <TouchableOpacity
                key={cell.dateKey}
                style={[
                  styles.dayCell,
                  isSelected && [styles.dayCellSelected, { backgroundColor: accent }],
                  cell.isToday && !isSelected && [styles.dayCellToday, { borderColor: accent }],
                ]}
                onPress={() => handleSelectDate(cell.dateKey)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: cell.isCurrentMonth ? textPrimary : textMuted },
                    isSelected && [styles.dayTextSelected, { color: textOnAccent }],
                    cell.isToday && !isSelected && [styles.dayTextToday, { color: accent }],
                  ]}
                >
                  {cell.dayNumber}
                </Text>

                {/* Dot indicator if date has tasks */}
                <View style={styles.dotContainer}>
                  {hasTasks && (
                    <View
                      style={[
                        styles.taskDot,
                        isSelected
                          ? [styles.taskDotSelected, { backgroundColor: textOnAccent }]
                          : { backgroundColor: accent },
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Selected Date Header & Tasks */}
      <View style={styles.tasksSection}>
        <View style={styles.tasksHeaderRow}>
          <View>
            <Text style={[styles.tasksDateTitle, { color: textPrimary }]}>
              {isSelectedToday ? 'Today' : formatDateLabel(selectedDateObj)}
            </Text>
            <Text style={[styles.tasksCountSub, { color: textSecondary }]}>
              {selectedDayTasks.length}{' '}
              {selectedDayTasks.length === 1 ? 'task' : 'tasks'} scheduled
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addDateBtn, { backgroundColor: accent }]}
            onPress={() => onAddNewTaskForDate(selectedDateObj)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color={textOnAccent} />
            <Text style={[styles.addDateBtnText, { color: textOnAccent }]}>Add</Text>
          </TouchableOpacity>
        </View>

        {selectedDayTasks.length === 0 ? (
          <View style={[styles.emptyDayBox, { backgroundColor: cardBg, borderColor: border }]}>
            <Ionicons
              name="calendar-clear-outline"
              size={40}
              color={textMuted}
            />
            <Text style={[styles.emptyDayText, { color: textMuted }]}>
              No tasks scheduled for this day
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { borderColor: accent }]}
              onPress={() => onAddNewTaskForDate(selectedDateObj)}
            >
              <Text style={[styles.emptyAddBtnText, { color: accent }]}>+ Create Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          selectedDayTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onPressTask={onPressTask}
              accentColor={accent}
              theme={theme}
            />
          ))
        )}
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
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  monthTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  todayBtn: {
    marginTop: 2,
  },
  todayBtnText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.accent,
    fontWeight: FONTS.weights.semibold,
  },
  navArrows: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  arrowBtn: {
    backgroundColor: COLORS.card,
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekdayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.bold,
  },
  weekendText: {
    color: COLORS.accent,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: COLORS.accent,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  dayText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  dayTextOutside: {
    color: COLORS.textMuted,
    opacity: 0.4,
  },
  dayTextSelected: {
    color: '#121212',
    fontWeight: FONTS.weights.bold,
  },
  dayTextToday: {
    color: COLORS.accent,
    fontWeight: FONTS.weights.bold,
  },
  dotContainer: {
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  taskDotSelected: {
    backgroundColor: '#121212',
  },
  tasksSection: {
    marginTop: SPACING.xs,
  },
  tasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tasksDateTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  tasksCountSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  addDateBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: '#121212',
  },
  emptyDayBox: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  emptyDayText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyAddBtn: {
    marginTop: SPACING.xs,
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  emptyAddBtnText: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
});
