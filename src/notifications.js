import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

export const CATEGORY_ID = 'task-reminder';

// Finite, gentle tactile vibration pattern: 350ms on, 150ms pause, 350ms on
export const VIBRATION_PATTERN = [0, 350, 150, 350];

// Strong finite vibration pattern for heavy sleepers: 500ms on, 200ms pause, 500ms on
export const HEAVY_SLEEPER_VIBRATION_PATTERN = [0, 500, 200, 500];

// Selectable Notification Sounds / Alarm Tones (including Samsung-inspired Morning Flower)
export const NOTIFICATION_SOUNDS = [
  {
    id: 'morning_flower',
    name: 'Morning Flower (Heavy Sleeper)',
    desc: 'Bright fast marimba/synth melody (Samsung-inspired)',
    icon: 'flower-outline',
    file: 'morning_flower.wav',
    channelId: 'planner-sound-morning_flower-v3',
    isSilent: false,
    isHeavySleeper: true,
    vibrationPattern: HEAVY_SLEEPER_VIBRATION_PATTERN,
  },
  {
    id: 'chime',
    name: 'Gentle Bell Chime',
    desc: 'Soft C5–C6 bell progression (Default)',
    icon: 'notifications',
    file: 'chime.wav',
    channelId: 'planner-sound-chime-v4',
    isSilent: false,
  },
  {
    id: 'musicbox',
    name: 'Sweet Music Box',
    desc: 'Delicate high pentatonic melody',
    icon: 'musical-notes',
    file: 'musicbox.wav',
    channelId: 'planner-sound-musicbox-v4',
    isSilent: false,
  },
  {
    id: 'marimba',
    name: 'Warm Marimba',
    desc: 'Earthy wooden mallet plucks',
    icon: 'grid',
    file: 'marimba.wav',
    channelId: 'planner-sound-marimba-v4',
    isSilent: false,
  },
  {
    id: 'lullaby',
    name: 'Soft Lullaby',
    desc: 'Gentle warm arpeggiated chord',
    icon: 'heart',
    file: 'lullaby.wav',
    channelId: 'planner-sound-lullaby-v4',
    isSilent: false,
  },
  {
    id: 'crystal',
    name: 'Crystal Bell',
    desc: 'Crisp shimmering digital chime',
    icon: 'sparkles',
    file: 'crystal.wav',
    channelId: 'planner-sound-crystal-v4',
    isSilent: false,
  },
  {
    id: 'sunrise',
    name: 'Sunrise Melody',
    desc: 'Cheerful morning ascending motif',
    icon: 'sunny',
    file: 'sunrise.wav',
    channelId: 'planner-sound-sunrise-v4',
    isSilent: false,
  },
  {
    id: 'zen',
    name: 'Zen Singing Bowl',
    desc: 'Deep soothing meditation resonance',
    icon: 'leaf',
    file: 'zen.wav',
    channelId: 'planner-sound-zen-v4',
    isSilent: false,
  },
  {
    id: 'silent',
    name: 'Silent / Vibrate Only',
    desc: 'Tactile vibration pulse without audio',
    icon: 'volume-mute',
    file: null,
    channelId: 'planner-sound-silent-v4',
    isSilent: true,
  },
];

export const CHANNEL_ID = NOTIFICATION_SOUNDS[0].channelId;
export const SOUND_FILE = NOTIFICATION_SOUNDS[0].file;

/**
 * Get notification sound configuration by id.
 */
export function getSoundOption(soundId) {
  return (
    NOTIFICATION_SOUNDS.find((s) => s.id === soundId) ||
    NOTIFICATION_SOUNDS.find((s) => s.id === 'chime') ||
    NOTIFICATION_SOUNDS[0]
  );
}

// Configure how notifications should behave when app is in the foreground
try {
  if (typeof Notifications?.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority:
          Notifications.AndroidNotificationPriority?.MAX ??
          Notifications.AndroidNotificationPriority?.HIGH ??
          'max',
      }),
    });
  }
} catch (error) {
  if (__DEV__) console.warn('Failed to configure notification handler:', error);
}

/**
 * Configure dedicated Android notification channels for each sound option.
 * Android locks a channel's sound upon creation, so having dedicated channels allows clean user switching.
 */
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  try {
    if (typeof Notifications?.setNotificationChannelAsync === 'function') {
      const importance =
        Notifications.AndroidImportance?.MAX ??
        Notifications.AndroidImportance?.HIGH ??
        7;

      for (const soundOpt of NOTIFICATION_SOUNDS) {
        try {
          await Notifications.setNotificationChannelAsync(soundOpt.channelId, {
            name: `Planner Alerts (${soundOpt.name})`,
            importance: importance,
            sound: soundOpt.isSilent ? null : soundOpt.file,
            enableVibrate: true,
            vibrationPattern: soundOpt.vibrationPattern || VIBRATION_PATTERN,
            enableLights: true,
            lightColor: '#FACC15',
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
            bypassDnd: false,
          });
        } catch (chanErr) {
          if (__DEV__) console.warn(`Channel setup error for ${soundOpt.id}:`, chanErr);
        }
      }
    }
  } catch (error) {
    if (__DEV__) console.warn('Error setting up notification channels:', error);
  }
}

// Backwards-compatibility alias
export const setupNotificationChannel = setupNotificationChannels;

/**
 * Register interactive notification categories with action buttons.
 * 'MARK_COMPLETE' & 'SNOOZE_10'
 */
export async function setupNotificationCategories() {
  try {
    if (typeof Notifications?.setNotificationCategoryAsync === 'function') {
      await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
        {
          identifier: 'MARK_COMPLETE',
          buttonTitle: 'Mark Complete',
          title: 'Mark Complete',
          options: {
            opensAppToForeground: false,
          },
          opensAppToForeground: false,
        },
        {
          identifier: 'SNOOZE_10',
          buttonTitle: 'Snooze 10m',
          title: 'Snooze 10m',
          options: {
            opensAppToForeground: false,
          },
          opensAppToForeground: false,
        },
      ]);
    }
  } catch (error) {
    if (__DEV__) console.warn('Error setting up notification categories:', error);
  }
}

/**
 * Request notification permissions from the user safely.
 * @returns {Promise<boolean>} Whether permissions are granted
 */
export async function requestNotificationPermissions() {
  try {
    if (typeof Notifications?.getPermissionsAsync !== 'function') {
      return false;
    }
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      if (typeof Notifications?.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    }
    return finalStatus === 'granted';
  } catch (error) {
    if (__DEV__) console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a local notification for a task with user-selected sound tone and interactive actions.
 * @param {Object} task - Task object with id, title, startDate/dateTime, priority
 * @param {Object} settings - { notificationsEnabled, reminderOffsetMinutes, selectedSoundId }
 * @returns {Promise<string|null>} notificationId or null
 */
export async function scheduleTaskNotification(task, settings) {
  if (!settings || !settings.notificationsEnabled) {
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    await setupNotificationChannels();
    await setupNotificationCategories();

    const taskTimeStr = task?.startDate || task?.dateTime;
    if (!taskTimeStr) return null;

    const taskTime = new Date(taskTimeStr).getTime();
    if (isNaN(taskTime)) return null;

    // Check task-specific reminder offset first, then fallback to global settings
    const rawOffset =
      task?.reminderMinutes !== undefined && task?.reminderMinutes !== null
        ? Number(task.reminderMinutes)
        : Number(settings?.reminderOffsetMinutes) || 0;

    // -1 explicitly means "No reminder / Off"
    if (rawOffset === -1) {
      if (task?.id) {
        await cancelExistingNotificationsForTask(task.id);
      }
      return null;
    }

    const now = Date.now();
    // If the task itself has already passed, don't schedule
    if (taskTime <= now) {
      return null;
    }

    let offsetMinutes = Math.max(0, rawOffset);
    let triggerTimestamp = taskTime - offsetMinutes * 60 * 1000;

    // SMART FALLBACK:
    // If reminder was set to e.g. 15m before, but task starts in 4m (triggerTimestamp is in past):
    // Fall back to alerting at event start time so the notification is never dropped!
    if (triggerTimestamp <= now) {
      triggerTimestamp = Math.max(taskTime, now + 3000);
      offsetMinutes = Math.max(0, Math.round((taskTime - triggerTimestamp) / 60000));
    }

    const triggerDate = new Date(triggerTimestamp);

    // Cancel any pre-existing scheduled alarms for this specific task to prevent duplicates
    if (task?.id) {
      await cancelExistingNotificationsForTask(task.id);
    }

    // Local Guardrail: Active alarm cap (~40 max) to prevent device throttling
    try {
      if (typeof Notifications?.getAllScheduledNotificationsAsync === 'function') {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (scheduled && scheduled.length >= 40) {
          if (__DEV__) console.warn('Notification cap reached (40 active alarms). Skipping additional alert.');
          return null;
        }
      }
    } catch (capErr) {
      // Non-fatal guardrail check
    }

    const priorityLabel = String(task.priority || 'medium').toUpperCase();
    const reminderPrefix =
      offsetMinutes > 0 ? `In ${offsetMinutes}m: ` : '';

    const isWakeUp = Boolean(task?.wakeUpGuard);
    // If Wake-Up Guard is enabled, default tone to 'morning_flower' unless overridden
    const soundId = isWakeUp
      ? (task?.soundId || settings?.wakeUpSoundId || 'morning_flower')
      : (task?.soundId || settings?.selectedSoundId || 'chime');
    const soundOpt = getSoundOption(soundId);

    const content = {
      title: isWakeUp
        ? `👁️ WAKE UP! ${reminderPrefix}${task.title || 'Alarm'}`
        : `⏰ ${reminderPrefix}${task.title || 'Task Reminder'}`,
      body: isWakeUp
        ? `🚨 Heavy-sleeper Wake-Up Guard active! Tap to solve Wake-Up Challenge.`
        : (task.description
            ? `[${priorityLabel}] ${task.description}`
            : `[${priorityLabel} Priority] Scheduled for ${new Date(
                taskTimeStr
              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
      data: {
        taskId: String(task.id),
        soundId,
        isWakeUpGuard: isWakeUp,
        burstIndex: 0,
      },
      sound: soundOpt.isSilent ? null : soundOpt.file,
      categoryIdentifier: CATEGORY_ID,
      priority:
        Notifications.AndroidNotificationPriority?.MAX ??
        Notifications.AndroidNotificationPriority?.HIGH ??
        'max',
      vibrate: isWakeUp
        ? (soundOpt.vibrationPattern || HEAVY_SLEEPER_VIBRATION_PATTERN)
        : (soundOpt.vibrationPattern || VIBRATION_PATTERN),
    };

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
      date: triggerDate,
      channelId: soundOpt.channelId,
    };

    if (typeof Notifications?.scheduleNotificationAsync !== 'function') {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    // If Wake-Up Guard (Eye icon) is armed, schedule 5 consecutive backup alert bursts
    if (isWakeUp && notificationId) {
      for (let burst = 1; burst <= 5; burst++) {
        const burstTimestamp = triggerTimestamp + burst * 60 * 1000;
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `👁️ WAKE UP! (Burst ${burst}/5): ${task.title || 'Alarm'}`,
              body: `🚨 Wake-Up Guard repeating alarm! Tap to solve Wake-Up Challenge.`,
              data: {
                taskId: String(task.id),
                soundId,
                isWakeUpGuard: true,
                burstIndex: burst,
              },
              sound: soundOpt.isSilent ? null : soundOpt.file,
              categoryIdentifier: CATEGORY_ID,
              priority:
                Notifications.AndroidNotificationPriority?.MAX ??
                Notifications.AndroidNotificationPriority?.HIGH ??
                'max',
              vibrate: HEAVY_SLEEPER_VIBRATION_PATTERN,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
              date: new Date(burstTimestamp),
              channelId: soundOpt.channelId,
            },
          });
        } catch (burstErr) {
          if (__DEV__) console.warn(`Error scheduling wake-up burst ${burst}:`, burstErr);
        }
      }
    }

    return notificationId || null;
  } catch (error) {
    if (__DEV__) console.warn('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Schedule a test notification in 2 seconds to preview selected tone, vibration, and interactive buttons.
 * @param {string} soundId
 * @returns {Promise<{ success: boolean, notificationId?: string, message?: string, soundName?: string }>}
 */
export async function scheduleTestNotification(soundId = 'chime') {
  try {
    try {
      Vibration.cancel();
    } catch (e) {}

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return {
        success: false,
        message: 'Notification permission is required. Please enable notifications in device settings.',
      };
    }

    await setupNotificationChannels();
    await setupNotificationCategories();

    const soundOpt = getSoundOption(soundId);
    const triggerDate = new Date(Date.now() + 2000); // 2 seconds from now

    const content = {
      title: `🔔 Tone Preview: ${soundOpt.name}`,
      body: soundOpt.isSilent
        ? 'Silent / Vibrate Only alert triggered.'
        : `Playing ${soundOpt.file} with tactile vibration.`,
      data: { taskId: 'test-notification', soundId },
      sound: soundOpt.isSilent ? null : soundOpt.file,
      categoryIdentifier: CATEGORY_ID,
      priority:
        Notifications.AndroidNotificationPriority?.MAX ??
        Notifications.AndroidNotificationPriority?.HIGH ??
        'max',
      vibrate: soundOpt.vibrationPattern || VIBRATION_PATTERN,
    };

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes?.TIME_INTERVAL ?? 'timeInterval',
      seconds: 2,
      channelId: soundOpt.channelId,
    };

    if (typeof Notifications?.scheduleNotificationAsync !== 'function') {
      return { success: false, message: 'Notifications module not available' };
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    return { success: true, notificationId, soundName: soundOpt.name };
  } catch (err) {
    if (__DEV__) console.warn('Error scheduling test notification:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Cancel any existing scheduled alarms for a specific taskId to avoid duplicate alarms.
 * @param {string|number} taskId
 */
export async function cancelExistingNotificationsForTask(taskId) {
  if (!taskId) return;
  try {
    if (typeof Notifications?.getAllScheduledNotificationsAsync !== 'function') {
      return;
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (!Array.isArray(scheduled)) return;
    const targetIdStr = String(taskId);

    for (const item of scheduled) {
      const scheduledTaskId = item?.content?.data?.taskId;
      if (scheduledTaskId && String(scheduledTaskId) === targetIdStr) {
        if (typeof Notifications?.cancelScheduledNotificationAsync === 'function') {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('Error clearing existing notifications for task:', err);
  }
}

/**
 * Clean up duplicate or orphaned notifications from device storage.
 * Keeps only 1 pending notification per incomplete task and removes orphaned ones.
 * @param {Array} tasks
 */
export async function cleanupDuplicateScheduledNotifications(tasks = []) {
  try {
    if (typeof Notifications?.getAllScheduledNotificationsAsync !== 'function') {
      return;
    }
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (!Array.isArray(scheduled) || scheduled.length === 0) return;

    const activeIncompleteTaskIds = new Set();
    if (Array.isArray(tasks)) {
      for (const t of tasks) {
        if (t && t.id && !t.completed) {
          activeIncompleteTaskIds.add(String(t.id));
        }
      }
    }

    const seenTaskIds = new Set();
    for (const item of scheduled) {
      const taskId = item?.content?.data?.taskId;
      if (taskId === 'test-notification') continue;

      if (!taskId || !activeIncompleteTaskIds.has(String(taskId))) {
        // Orphaned or already completed task notification -> cancel
        if (typeof Notifications?.cancelScheduledNotificationAsync === 'function') {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
        continue;
      }

      if (seenTaskIds.has(String(taskId)) && !item?.content?.data?.isWakeUpGuard) {
        // Duplicate notification for the same task -> cancel
        if (typeof Notifications?.cancelScheduledNotificationAsync === 'function') {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        }
      } else {
        seenTaskIds.add(String(taskId));
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('Error running cleanupDuplicateScheduledNotifications:', err);
  }
}

/**
 * Reschedule a task notification for X minutes from now (Snooze).
 * Ensures any lingering vibration is cancelled and existing notifications for this task are cleared.
 * @param {Object|string} taskOrId
 * @param {number} minutes
 * @param {string} soundId
 * @returns {Promise<string|null>} new notificationId
 */
export async function snoozeTaskNotification(taskOrId, minutes = 10, soundId = 'chime') {
  try {
    try {
      Vibration.cancel();
    } catch (e) {}

    const taskId =
      typeof taskOrId === 'object' && taskOrId ? taskOrId.id : taskOrId;
    const taskTitle =
      typeof taskOrId === 'object' && taskOrId?.title
        ? taskOrId.title
        : 'Snoozed Task';

    if (!taskId) return null;

    // Immediately cancel and dismiss any existing notification for this task
    await cancelExistingNotificationsForTask(taskId);
    if (typeof taskOrId === 'object' && taskOrId?.notificationId) {
      await dismissNotification(taskOrId.notificationId);
    }

    // Local Guardrail: Active alarm cap (~40 max)
    try {
      if (typeof Notifications?.getAllScheduledNotificationsAsync === 'function') {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (scheduled && scheduled.length >= 40) {
          if (__DEV__) console.warn('Notification cap reached (40 active alarms). Skipping snooze scheduling.');
          return null;
        }
      }
    } catch (capErr) {}

    await setupNotificationChannels();
    await setupNotificationCategories();

    const triggerDate = new Date(Date.now() + minutes * 60 * 1000);
    const soundOpt = getSoundOption(soundId);

    const content = {
      title: `⏰ Snoozed: ${taskTitle}`,
      body: `Reminder snoozed for ${minutes} minutes.`,
      data: { taskId: String(taskId), soundId },
      sound: soundOpt.isSilent ? null : soundOpt.file,
      categoryIdentifier: CATEGORY_ID,
      priority:
        Notifications.AndroidNotificationPriority?.MAX ??
        Notifications.AndroidNotificationPriority?.HIGH ??
        'max',
      vibrate: soundOpt.vibrationPattern || VIBRATION_PATTERN,
    };

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date',
      date: triggerDate,
      channelId: soundOpt.channelId,
    };

    if (typeof Notifications?.scheduleNotificationAsync !== 'function') {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    return notificationId || null;
  } catch (err) {
    if (__DEV__) console.warn('Error snoozing task notification:', err);
    return null;
  }
}

/**
 * Dismiss a displayed notification safely and cancel any running vibration immediately.
 * @param {string} notificationIdentifier
 */
export async function dismissNotification(notificationIdentifier) {
  try {
    Vibration.cancel();
  } catch (e) {}
  if (!notificationIdentifier) return;
  try {
    if (typeof Notifications?.dismissNotificationAsync === 'function') {
      await Notifications.dismissNotificationAsync(String(notificationIdentifier));
    }
  } catch (error) {
    if (__DEV__) console.warn('Error dismissing notification:', error);
  }
}

/**
 * Cancel a scheduled task notification safely and cancel vibration.
 * @param {string} notificationId
 */
export async function cancelTaskNotification(notificationId) {
  try {
    Vibration.cancel();
  } catch (e) {}
  if (!notificationId) return;
  try {
    if (typeof Notifications?.cancelScheduledNotificationAsync === 'function') {
      await Notifications.cancelScheduledNotificationAsync(
        String(notificationId)
      );
    }
  } catch (error) {
    if (__DEV__) console.warn('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications safely.
 */
export async function cancelAllTaskNotifications() {
  try {
    Vibration.cancel();
  } catch (e) {}
  try {
    if (
      typeof Notifications?.cancelAllScheduledNotificationsAsync === 'function'
    ) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch (error) {
    if (__DEV__) console.warn('Error canceling all notifications:', error);
  }
}
