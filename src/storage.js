import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = '@planner_tasks';
const SETTINGS_KEY = '@planner_settings';

export const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  reminderOffsetMinutes: 0, // 0 = at time of event, 15 = 15m before, 30 = 30m before
  selectedSoundId: 'chime',
};

/**
 * Load all tasks from AsyncStorage.
 * @returns {Promise<Array>} Array of task objects
 */
export async function loadTasks() {
  try {
    const json = await AsyncStorage.getItem(TASKS_KEY);
    const parsed = json ? JSON.parse(json) : [];

    // Deduplicate any accidental clones created by repeated loop scheduling
    const seenIds = new Set();
    const seenSignatures = new Map();
    const uniqueList = [];
    let hadDuplicates = false;

    for (const t of parsed) {
      if (!t || !t.id) continue;
      if (seenIds.has(t.id)) {
        hadDuplicates = true;
        continue;
      }
      seenIds.add(t.id);

      // Signature to detect clone spam created in the exact same loop burst:
      // same title, same startDate, same completed status
      const sig = `${t.title || ''}_${t.startDate || t.dateTime || ''}_${!!t.completed}`;
      const existingTime = seenSignatures.get(sig);
      const currentTime = new Date(t.createdAt || 0).getTime();

      // If identical task was created within 5 seconds of the previous one (loop spam symptom):
      if (existingTime && Math.abs(currentTime - existingTime) < 5000) {
        hadDuplicates = true;
        continue;
      }
      seenSignatures.set(sig, currentTime);
      uniqueList.push(t);
    }

    if (hadDuplicates) {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(uniqueList));
    }

    return uniqueList.map((t) => {
      const startDate = t.startDate || t.dateTime || new Date().toISOString();
      const hasDueDate = Boolean(t.hasDueDate || t.dueDate || t.deadline);
      const dueDate = hasDueDate ? (t.dueDate || t.deadline || null) : null;
      const reminderMinutes =
        t.reminderMinutes !== undefined && t.reminderMinutes !== null
          ? t.reminderMinutes
          : null;
      const wakeUpGuard = Boolean(t.wakeUpGuard);
      return {
        priority: t.priority || 'medium',
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        icon: t.icon || null,
        repeat: t.repeat || 'none',
        reminderMinutes,
        wakeUpGuard,
        ...t,
        startDate,
        dateTime: startDate, // backward compatibility
        hasDueDate,
        dueDate,
      };
    });
  } catch (e) {
    console.error('loadTasks error:', e);
    return [];
  }
}

/**
 * Save the full tasks array to AsyncStorage.
 * @param {Array} tasks
 */
export async function saveTasks(tasks) {
  try {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('saveTasks error:', e);
  }
}

/**
 * Add a new task.
 * @param {Array} tasks  - current tasks
 * @param {Object} task  - new task object (without id)
 * @returns {Array} updated tasks
 */
export async function addTask(tasks, task) {
  const startDate = task.startDate || task.dateTime || new Date().toISOString();
  const hasDueDate = Boolean(task.hasDueDate && task.dueDate);
  const dueDate = hasDueDate ? task.dueDate : null;
  const reminderMinutes =
    task.reminderMinutes !== undefined && task.reminderMinutes !== null
      ? task.reminderMinutes
      : null;
  const wakeUpGuard = Boolean(task.wakeUpGuard);

  const newTask = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
    completed: false,
    priority: task.priority || 'medium',
    icon: task.icon || null,
    repeat: task.repeat || 'none',
    reminderMinutes,
    wakeUpGuard,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    createdAt: new Date().toISOString(),
    notificationId: task.notificationId || null,
    ...task,
    startDate,
    dateTime: startDate, // Maintain backward compatibility
    hasDueDate,
    dueDate,
  };
  const updated = [...tasks, newTask];
  await saveTasks(updated);
  return updated;
}

/**
 * Update an existing task by id.
 * @param {Array} tasks
 * @param {string} id
 * @param {Object} changes
 * @returns {Array} updated tasks
 */
export async function updateTask(tasks, id, changes) {
  const updated = tasks.map((t) => (t.id === id ? { ...t, ...changes } : t));
  await saveTasks(updated);
  return updated;
}

/**
 * Delete a task by id.
 * @param {Array} tasks
 * @param {string} id
 * @returns {Array} updated tasks
 */
export async function deleteTask(tasks, id) {
  const updated = tasks.filter((t) => t.id !== id);
  await saveTasks(updated);
  return updated;
}

/**
 * Toggle the completed status of a task.
 * @param {Array} tasks
 * @param {string} id
 * @returns {Array} updated tasks
 */
export async function toggleTask(tasks, id) {
  const updated = tasks.map((t) => {
    if (t.id === id) {
      const nextCompleted = !t.completed;
      const updatedSubtasks =
        nextCompleted && Array.isArray(t.subtasks)
          ? t.subtasks.map((s) => ({ ...s, completed: true }))
          : t.subtasks;
      return {
        ...t,
        completed: nextCompleted,
        subtasks: updatedSubtasks,
      };
    }
    return t;
  });
  await saveTasks(updated);
  return updated;
}

/**
 * Update subtasks of a task and handle auto-completion if all are done.
 * @param {Array} tasks
 * @param {string} taskId
 * @param {Array} subtasks
 * @returns {{ updatedTasks: Array, autoCompleted: boolean }}
 */
export async function updateTaskSubtasks(tasks, taskId, subtasks) {
  let autoCompleted = false;
  const allSubtasksDone =
    subtasks.length > 0 && subtasks.every((s) => s.completed);

  const updatedTasks = tasks.map((t) => {
    if (t.id === taskId) {
      const shouldComplete = allSubtasksDone ? true : t.completed;
      if (allSubtasksDone && !t.completed) {
        autoCompleted = true;
      }
      return {
        ...t,
        subtasks,
        completed: shouldComplete,
      };
    }
    return t;
  });

  await saveTasks(updatedTasks);
  return { updatedTasks, autoCompleted };
}

/**
 * Clear all completed tasks from storage.
 * @param {Array} tasks
 * @returns {Array} remaining pending tasks
 */
export async function clearCompletedTasks(tasks) {
  const remaining = tasks.filter((t) => !t.completed);
  await saveTasks(remaining);
  return remaining;
}

/**
 * Import tasks from a backup array or backup envelope.
 * @param {Array} currentTasks
 * @param {string|Object|Array} backupData
 * @param {boolean} merge - if true merges by id, if false replaces all tasks
 * @returns {{ success: boolean, tasks: Array, message: string }}
 */
export async function importBackupData(currentTasks, backupData, merge = false) {
  try {
    let parsed = typeof backupData === 'string' ? JSON.parse(backupData) : backupData;

    // Support both raw tasks array and envelope object { tasks: [...], settings: {...} }
    let incomingTasks = [];
    if (Array.isArray(parsed)) {
      incomingTasks = parsed;
    } else if (parsed && Array.isArray(parsed.tasks)) {
      incomingTasks = parsed.tasks;
      if (parsed.settings) {
        await saveSettings(parsed.settings);
      }
    } else {
      return {
        success: false,
        tasks: currentTasks,
        message: 'Invalid backup format. Expected a list of tasks.',
      };
    }

    // Guardrail: Enforce a safety cap of 500 tasks on imports
    const MAX_TASKS_CAP = 500;
    const cappedIncoming = incomingTasks.slice(0, MAX_TASKS_CAP);

    // Clean and validate incoming tasks
    const cleaned = cappedIncoming
      .filter((t) => t && typeof t === 'object' && t.title && (t.startDate || t.dateTime))
      .map((t) => {
        const startDate = new Date(t.startDate || t.dateTime).toISOString();
        const hasDueDate = Boolean(t.hasDueDate || t.dueDate || t.deadline);
        const dueDate = hasDueDate && (t.dueDate || t.deadline)
          ? new Date(t.dueDate || t.deadline).toISOString()
          : null;

        return {
          id: t.id ? String(t.id) : Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
          title: String(t.title),
          description: t.description ? String(t.description) : '',
          startDate,
          dateTime: startDate, // backward compatibility
          hasDueDate,
          dueDate,
          completed: Boolean(t.completed),
          priority: t.priority || 'medium',
          icon: t.icon || null,
          repeat: t.repeat || 'none',
          subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
          createdAt: t.createdAt || new Date().toISOString(),
          notificationId: null,
        };
      });

    let finalTasks = [];
    if (merge) {
      const existingMap = new Map(currentTasks.map((t) => [t.id, t]));
      cleaned.forEach((t) => existingMap.set(t.id, t));
      finalTasks = Array.from(existingMap.values());
    } else {
      finalTasks = cleaned;
    }

    await saveTasks(finalTasks);
    return {
      success: true,
      tasks: finalTasks,
      message: `Successfully imported ${cleaned.length} task(s)!`,
    };
  } catch (error) {
    return {
      success: false,
      tasks: currentTasks,
      message: 'Failed to parse backup data: ' + error.message,
    };
  }
}

/**
 * Load user settings from AsyncStorage.
 * @returns {Promise<Object>}
 */
export async function loadSettings() {
  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    return json ? { ...DEFAULT_SETTINGS, ...JSON.parse(json) } : DEFAULT_SETTINGS;
  } catch (e) {
    console.error('loadSettings error:', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings to AsyncStorage.
 * @param {Object} settings
 */
export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('saveSettings error:', e);
  }
}
