import { PRIORITY_CONFIG } from './theme.js';

/**
 * Format a Date object to local 'YYYY-MM-DD' string.
 * Uses local getFullYear(), getMonth() + 1, and getDate() to guarantee exact local calendar day.
 */
export function toLocalDateKey(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const formatDateKey = toLocalDateKey;

/**
 * Parse a 'YYYY-MM-DD' string into a local Date object without UTC timezone drift.
 */
export function parseLocalDateKey(dateKey) {
  if (!dateKey) return new Date();
  if (dateKey instanceof Date) return new Date(dateKey);
  const parts = String(dateKey).split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0, 0);
  }
  return new Date(dateKey);
}

/**
 * Format a Date object to a human-readable time string (e.g., "3:05 PM").
 */
export function formatTime(date) {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Format a date to a readable label (e.g., "Nov 8" or "Fri, Nov 8").
 */
export function formatDateLabel(date, includeWeekday = false) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  if (includeWeekday) {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format Month & Year for header (e.g., "November 2026").
 */
export function getMonthYearLabel(year, month) {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Returns the array of 7 Date objects for the current week (Sun–Sat),
 * centered around today.
 */
export function getCurrentWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

/**
 * Short day labels.
 */
export const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Check if an incomplete task is overdue.
 * If the task has a specific Due Date/Deadline (hasDueDate = true), dueDate is used.
 * Otherwise, the scheduled Start Date/Time is used.
 */
export function isTaskOverdue(task) {
  if (!task || task.completed) return false;
  if (task.hasDueDate && task.dueDate) {
    const dueTime = new Date(task.dueDate).getTime();
    if (!isNaN(dueTime)) {
      return dueTime < Date.now();
    }
  }
  const startTime = new Date(task.startDate || task.dateTime).getTime();
  if (isNaN(startTime)) return false;
  return startTime < Date.now();
}

/**
 * Check if an incomplete task is from a strictly past date.
 */
export function isTaskFromPastDate(task) {
  if (!task || task.completed) return false;
  const dateToCheck =
    task.hasDueDate && task.dueDate
      ? task.dueDate
      : task.startDate || task.dateTime;
  const taskDate = new Date(dateToCheck);
  if (isNaN(taskDate.getTime())) return false;
  return formatDateKey(taskDate) < formatDateKey(new Date());
}

/**
 * Calculate the next occurrence for a recurring task.
 * Advances both start date and due date (if set) by the recurring interval.
 * @param {Object} task
 * @returns {Object|null} New task object or null if not recurring
 */
export function calculateNextOccurrence(task) {
  if (!task.repeat || task.repeat === 'none') return null;

  const originalStart = new Date(task.startDate || task.dateTime);
  if (isNaN(originalStart.getTime())) return null;

  const now = new Date();
  let nextStart = new Date(originalStart);
  let diffDays = 1;

  if (task.repeat === 'daily') {
    nextStart.setDate(nextStart.getDate() + 1);
    if (nextStart.getTime() <= now.getTime()) {
      nextStart = new Date(now);
      nextStart.setDate(now.getDate() + 1);
      nextStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    }
    diffDays = Math.max(1, Math.round((nextStart.getTime() - originalStart.getTime()) / (24 * 60 * 60 * 1000)));
  } else if (task.repeat === 'weekly') {
    nextStart.setDate(nextStart.getDate() + 7);
    if (nextStart.getTime() <= now.getTime()) {
      nextStart = new Date(now);
      nextStart.setDate(now.getDate() + 7);
      nextStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    }
    diffDays = Math.max(7, Math.round((nextStart.getTime() - originalStart.getTime()) / (24 * 60 * 60 * 1000)));
  }

  let nextDue = null;
  if (task.hasDueDate && task.dueDate) {
    const originalDue = new Date(task.dueDate);
    if (!isNaN(originalDue.getTime())) {
      nextDue = new Date(originalDue);
      nextDue.setDate(nextDue.getDate() + diffDays);
    }
  }

  // Reset subtasks for next occurrence with new ids and uncompleted state
  const resetSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.map((s) => ({
        ...s,
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
        completed: false,
      }))
    : [];

  return {
    ...task,
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
    startDate: nextStart.toISOString(),
    dateTime: nextStart.toISOString(), // Maintain backward compatibility
    hasDueDate: Boolean(task.hasDueDate && nextDue),
    dueDate: nextDue ? nextDue.toISOString() : null,
    completed: false,
    subtasks: resetSubtasks,
    createdAt: new Date().toISOString(),
    notificationId: null,
  };
}

/**
 * Sort tasks by nearest target timestamp first.
 * For tasks with a Due Date, uses dueDate. For others, uses startDate / dateTime.
 * If timestamps are identical, break tie by Priority (HIGH -> MED -> LOW).
 */
export function sortTasksByDateTime(tasks) {
  return [...tasks].sort((a, b) => {
    const timeA = new Date(
      a.hasDueDate && a.dueDate ? a.dueDate : a.startDate || a.dateTime
    ).getTime();
    const timeB = new Date(
      b.hasDueDate && b.dueDate ? b.dueDate : b.startDate || b.dateTime
    ).getTime();

    const validA = !isNaN(timeA);
    const validB = !isNaN(timeB);

    if (!validA && !validB) return 0;
    if (!validA) return 1;
    if (!validB) return -1;

    // Earliest deadline/target first
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // Tie-breaker: HIGH (3) > MED (2) > LOW (1)
    const pA = String(a.priority || 'medium').toLowerCase();
    const pB = String(b.priority || 'medium').toLowerCase();
    const weightA = PRIORITY_CONFIG[pA]?.weight ?? 2;
    const weightB = PRIORITY_CONFIG[pB]?.weight ?? 2;
    return weightB - weightA;
  });
}

/**
 * Calculate progress of subtasks array.
 * @param {Array} subtasks
 * @returns {{ completed: number, total: number, percentage: number, allCompleted: boolean }}
 */
export function calculateSubtaskProgress(subtasks) {
  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0, allCompleted: false };
  }
  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const percentage = Math.round((completed / total) * 100);
  const allCompleted = total > 0 && completed === total;
  return { completed, total, percentage, allCompleted };
}

/**
 * Filter tasks by a specific date key (YYYY-MM-DD).
 * Start Date determines which calendar day the task appears on.
 */
export function filterTasksByDate(tasks, dateKey) {
  if (!Array.isArray(tasks)) return [];
  const targetKey = String(dateKey);
  return tasks.filter((t) => {
    if (!t) return false;
    const dateVal = t.startDate || t.dateTime;
    if (!dateVal) return false;
    return toLocalDateKey(dateVal) === targetKey;
  });
}

/**
 * Build a grid of calendar cells for a given month and year.
 * Returns array of days with leading/trailing days for a clean grid.
 */
export function getCalendarGridDays(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayKey = toLocalDateKey(new Date());
  const grid = [];

  // Leading days from previous month
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const date = new Date(year, month - 1, dayNum);
    grid.push({
      date,
      dateKey: toLocalDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: toLocalDateKey(date) === todayKey,
    });
  }

  // Days of current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const date = new Date(year, month, dayNum);
    grid.push({
      date,
      dateKey: toLocalDateKey(date),
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: toLocalDateKey(date) === todayKey,
    });
  }

  // Trailing days from next month to complete the row (multiples of 7)
  const remainingDays = 7 - (grid.length % 7);
  if (remainingDays < 7) {
    for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
      const date = new Date(year, month + 1, dayNum);
      grid.push({
        date,
        dateKey: toLocalDateKey(date),
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: toLocalDateKey(date) === todayKey,
      });
    }
  }

  return grid;
}

/**
 * Get a set of date keys that have at least one task.
 */
export function getDatesWithTasks(tasks) {
  const dateSet = new Set();
  if (Array.isArray(tasks)) {
    tasks.forEach((t) => {
      const dateVal = t?.startDate || t?.dateTime;
      if (dateVal) {
        dateSet.add(toLocalDateKey(dateVal));
      }
    });
  }
  return dateSet;
}
