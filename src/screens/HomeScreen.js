import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Alert,
  Vibration,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import {
  loadTasks,
  addTask,
  updateTask,
  deleteTask,
  toggleTask,
  clearCompletedTasks,
  loadSettings,
  saveSettings,
  updateTaskSubtasks,
  importBackupData,
} from '../storage';
import {
  formatDateKey,
  toLocalDateKey,
  parseLocalDateKey,
  formatDateLabel,
  sortTasksByDateTime,
  filterTasksByDate,
  isTaskOverdue,
  calculateNextOccurrence,
} from '../utils';
import {
  scheduleTaskNotification,
  cancelTaskNotification,
  setupNotificationChannels,
  setupNotificationChannel,
  setupNotificationCategories,
  snoozeTaskNotification,
  dismissNotification,
  cleanupDuplicateScheduledNotifications,
} from '../notifications';
import * as Notifications from 'expo-notifications';
import { triggerHaptic } from '../haptics';

import WeekCalendarStrip from '../components/WeekCalendarStrip';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import WakeUpModal from '../components/WakeUpModal';
import SectionHeader from '../components/SectionHeader';
import ProPaywallModal from '../components/ProPaywallModal';

import CalendarScreen from './CalendarScreen';
import StatsScreen from './StatsScreen';
import SettingsScreen from './SettingsScreen';

import {
  checkProStatus,
  loadSavedThemeSettings,
  saveThemeSettings,
} from '../billing';
import { getAdaptiveTheme, getAccentById, getBackgroundById } from '../theme';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'calendar' | 'stats' | 'settings'
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    reminderOffsetMinutes: 0,
  });

  const [isPro, setIsPro] = useState(false);
  const [activeBgId, setActiveBgId] = useState('midnight');
  const [activeAccentId, setActiveAccentId] = useState('gold');
  const [isCozy, setIsCozy] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Compute full adaptive contrast tokens for current background + accent + cozy mode
  const currentTheme = getAdaptiveTheme(activeBgId, activeAccentId, isCozy);
  const accentColor = currentTheme.accent;

  // Keep static COLORS singleton synchronized as fallback
  COLORS.accent = currentTheme.accent;
  COLORS.accentDark = currentTheme.accentDark;
  COLORS.background = currentTheme.screenBg;
  COLORS.card = currentTheme.cardBg;
  COLORS.border = currentTheme.border;
  COLORS.text = currentTheme.textPrimary;
  COLORS.textSecondary = currentTheme.textSecondary;
  COLORS.textMuted = currentTheme.textMuted;

  const [selectedDateKey, setSelectedDateKey] = useState(
    formatDateKey(new Date())
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsTask, setDetailsTask] = useState(null);
  const [wakeUpModalVisible, setWakeUpModalVisible] = useState(false);
  const [wakeUpTask, setWakeUpTask] = useState(null);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleSelectTheme = async (accentId) => {
    setActiveAccentId(accentId);
    await saveThemeSettings({ accentId });
  };

  const handleSelectBg = async (bgId) => {
    setActiveBgId(bgId);
    await saveThemeSettings({ bgId });
  };

  const handleToggleCozy = async (newCozy) => {
    setIsCozy(newCozy);
    await saveThemeSettings({ isCozy: newCozy });
  };

  const handleProStatusChanged = (status) => {
    setIsPro(status);
    if (!status) {
      setActiveBgId('midnight');
      setActiveAccentId('gold');
      setIsCozy(false);
    }
  };

  // Sync detailsTask when tasks list updates
  useEffect(() => {
    if (detailsTask) {
      const current = tasks.find((t) => t.id === detailsTask.id);
      if (current) {
        setDetailsTask(current);
      }
    }
  }, [tasks]);

  // Notification response deduplication, concurrency lock and references
  const handledResponsesRef = useRef(new Set());
  const processingActionRef = useRef(false);
  const settingsRef = useRef(settings);
  const tasksRef = useRef(tasks);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Unified, deduplicated interactive notification action handler
  const handleNotificationResponse = useCallback(async (response) => {
    if (!response) return;

    try {
      try {
        Vibration.cancel();
      } catch (e) {}

      const notificationId = response?.notification?.request?.identifier;
      const actionId = response?.actionIdentifier || 'DEFAULT';
      const taskId = response?.notification?.request?.content?.data?.taskId;

      // Deduplication guard: ignore if already handled
      const dedupKey = `${notificationId || 'unknown'}_${actionId}_${taskId || 'notask'}`;
      if (handledResponsesRef.current.has(dedupKey)) {
        return;
      }
      handledResponsesRef.current.add(dedupKey);

      // Keep bounded set size
      if (handledResponsesRef.current.size > 50) {
        const first = handledResponsesRef.current.values().next().value;
        handledResponsesRef.current.delete(first);
      }

      // Always dismiss the notification banner immediately
      if (notificationId) {
        await dismissNotification(notificationId);
      }

      if (!taskId || taskId === 'test-notification') {
        return;
      }

      // Concurrency lock to avoid rapid multi-firing
      if (processingActionRef.current) return;
      processingActionRef.current = true;

      const currentTasks = await loadTasks();
      const currentSettings = settingsRef.current;
      const target = currentTasks.find((t) => t.id === taskId);

      if (actionId === 'MARK_COMPLETE') {
        triggerHaptic('success');
        if (target && !target.completed) {
          let updated = await toggleTask(currentTasks, taskId);
          if (target.repeat && target.repeat !== 'none') {
            const nextTask = calculateNextOccurrence(target);
            try {
              const nextNotifId = await scheduleTaskNotification(
                nextTask,
                currentSettings
              );
              nextTask.notificationId = nextNotifId;
            } catch (e) {
              if (__DEV__) console.warn('Failed to schedule next recurring notification:', e);
            }
            updated = await addTask(updated, nextTask);
          }
          setTasks(updated);
        }
      } else if (actionId === 'SNOOZE_10') {
        triggerHaptic('medium');
        const newNotificationId = await snoozeTaskNotification(
          target || taskId,
          10,
          currentSettings?.selectedSoundId
        );
        if (target && newNotificationId) {
          const updated = await updateTask(currentTasks, taskId, {
            notificationId: newNotificationId,
          });
          setTasks(updated);
        }
      } else {
        // Direct tap on notification banner
        const isWakeUp =
          response?.notification?.request?.content?.data?.isWakeUpGuard ||
          target?.wakeUpGuard;
        if (target && isWakeUp) {
          triggerHaptic('medium');
          setWakeUpTask(target);
          setWakeUpModalVisible(true);
        } else if (target) {
          triggerHaptic('light');
          setDetailsTask(target);
          setDetailsVisible(true);
        }
      }
    } catch (respErr) {
      if (__DEV__) console.warn('Error handling notification action:', respErr);
    } finally {
      processingActionRef.current = false;
    }
  }, []);

  // Initial load, channel setup & cold-start response (runs strictly ONCE on mount)
  useEffect(() => {
    let responseSubscription = null;
    let appStateSub = null;

    (async () => {
      try {
        await setupNotificationChannels();
        await setupNotificationCategories();
      } catch (err) {
        if (__DEV__) console.warn('Channel/Categories setup error:', err);
      }

      const [loadedTasks, loadedSettings, loadedPro, loadedThemeSettings] =
        await Promise.all([
          loadTasks(),
          loadSettings(),
          checkProStatus(),
          loadSavedThemeSettings(),
        ]);

      setTasks(loadedTasks);
      setSettings(loadedSettings);
      setIsPro(loadedPro);

      if (loadedThemeSettings) {
        setActiveBgId(loadedThemeSettings.bgId || 'midnight');
        setActiveAccentId(loadedThemeSettings.accentId || 'gold');
        setIsCozy(!!loadedThemeSettings.isCozy);
      }

      // Clean up any duplicate / orphaned alarms left by loops or deleted tasks
      try {
        await cleanupDuplicateScheduledNotifications(loadedTasks);
      } catch (e) {
        if (__DEV__) console.warn('Cleanup scheduled notifications error:', e);
      }

      // Check cold-start notification response strictly once on startup
      try {
        if (typeof Notifications?.getLastNotificationResponseAsync === 'function') {
          const initialResponse = await Notifications.getLastNotificationResponseAsync();
          if (initialResponse) {
            await handleNotificationResponse(initialResponse);
          }
        }
      } catch (coldStartErr) {
        if (__DEV__) console.warn('Error reading cold-start notification:', coldStartErr);
      }
    })();

    // Always cancel lingering vibration when app returns to foreground
    appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        try {
          Vibration.cancel();
        } catch (e) {}
      }
    });

    // Register active notification response listener strictly once
    try {
      if (
        typeof Notifications?.addNotificationResponseReceivedListener ===
        'function'
      ) {
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            handleNotificationResponse
          );
      }
    } catch (listenerErr) {
      if (__DEV__) console.warn('Failed to register notification listener:', listenerErr);
    }

    return () => {
      try {
        if (appStateSub && typeof appStateSub.remove === 'function') {
          appStateSub.remove();
        }
        if (
          responseSubscription &&
          typeof responseSubscription.remove === 'function'
        ) {
          responseSubscription.remove();
        }
      } catch (e) {}
    };
  }, [handleNotificationResponse]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const loaded = await loadTasks();
    setTasks(loaded);
    setRefreshing(false);
  }, []);

  // Selected date calculations
  const todayKey = toLocalDateKey(new Date());
  const isToday = selectedDateKey === todayKey;
  const selectedDateObj = parseLocalDateKey(selectedDateKey);
  const dateHeading = isToday ? 'Today' : formatDateLabel(selectedDateObj, true);

  // Filtered tasks for selected day on Home tab
  const dayTasks = filterTasksByDate(tasks, selectedDateKey);

  // Overdue Auto-Rollover: when viewing Today, include incomplete tasks from past dates
  const overduePastTasks = isToday
    ? tasks.filter((t) => {
        if (t.completed || !isTaskOverdue(t)) return false;
        const targetDate =
          t.hasDueDate && t.dueDate
            ? t.dueDate
            : t.startDate || t.dateTime;
        return toLocalDateKey(new Date(targetDate)) < todayKey;
      })
    : [];

  const combinedPending = isToday
    ? [...overduePastTasks, ...dayTasks.filter((t) => !t.completed)]
    : dayTasks.filter((t) => !t.completed);

  // Sort: overdue tasks automatically appear at the top with red OVERDUE badge,
  // sorted by nearest deadline first, broken by Priority tie-breaker
  const pendingTasks = [...combinedPending].sort((a, b) => {
    const overdueA = isTaskOverdue(a);
    const overdueB = isTaskOverdue(b);
    if (overdueA && !overdueB) return -1;
    if (!overdueA && overdueB) return 1;
    return sortTasksByDateTime([a, b])[0] === a ? -1 : 1;
  });

  const completedTasks = sortTasksByDateTime(
    dayTasks.filter((t) => t.completed)
  );

  // Counts
  const allPendingCount = tasks.filter((t) => !t.completed).length;
  const allCompletedCount = tasks.filter((t) => t.completed).length;

  // Add / Edit Task
  const handleSaveTask = async (taskData) => {
    if (!taskData || !taskData.title || !taskData.title.trim()) {
      Alert.alert('Required Field', 'Please enter a task title.');
      return;
    }

    try {
      const isEdit = !!(editingTask && editingTask.id);
      const targetId = isEdit ? editingTask.id : Date.now().toString();
      const oldNotificationId = editingTask?.notificationId;
      const targetDateKey = toLocalDateKey(taskData.startDate || taskData.dateTime);

      // Close modal immediately and clear edit state
      setModalVisible(false);
      setEditingTask(null);

      // 1. Save task to React state and AsyncStorage FIRST
      let updatedTasks;
      if (isEdit) {
        updatedTasks = await updateTask(tasks, targetId, {
          ...taskData,
          id: targetId,
        });
      } else {
        updatedTasks = await addTask(tasks, {
          ...taskData,
          id: targetId,
        });
        setSelectedDateKey(targetDateKey);
      }
      setTasks(updatedTasks);

      // 2. Run notification scheduling in a separate isolated try/catch
      (async () => {
        try {
          if (oldNotificationId) {
            await cancelTaskNotification(oldNotificationId);
          }

          if (settings.notificationsEnabled && !(isEdit && editingTask?.completed)) {
            const newNotifId = await scheduleTaskNotification(
              { ...taskData, id: targetId },
              settings
            );
            if (newNotifId) {
              const withNotif = await updateTask(updatedTasks, targetId, {
                notificationId: newNotifId,
              });
              setTasks(withNotif);
            }
          }
        } catch (notifErr) {
          console.warn('Asynchronous notification scheduling error (non-blocking):', notifErr);
        }
      })();
    } catch (err) {
      console.warn('Error saving task:', err);
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

  // Toggle complete
  const handleToggleTask = async (id) => {
    try {
      const target = tasks.find((t) => t.id === id);
      if (!target) return;

      let nextRecurringTask = null;
      if (!target.completed) {
        // Marking completed -> cancel notification
        if (target.notificationId) {
          try {
            await cancelTaskNotification(target.notificationId);
          } catch (e) {
            console.warn('Failed to cancel notification:', e);
          }
        }

        // Recurring tasks: when a recurring task is completed, schedule next occurrence
        if (target.repeat && target.repeat !== 'none') {
          nextRecurringTask = calculateNextOccurrence(target);
          if (settings.notificationsEnabled) {
            try {
              const nextNotifId = await scheduleTaskNotification(
                nextRecurringTask,
                settings
              );
              nextRecurringTask.notificationId = nextNotifId;
            } catch (e) {
              console.warn('Failed to schedule next recurring notification:', e);
            }
          }
        }
      } else {
        // Unmarking completed -> reschedule notification if in future
        let notificationId = null;
        try {
          notificationId = await scheduleTaskNotification(target, settings);
        } catch (e) {
          console.warn('Failed to reschedule notification:', e);
        }
        await updateTask(tasks, id, { notificationId });
      }

      let updated = await toggleTask(tasks, id);
      if (nextRecurringTask) {
        updated = await addTask(updated, nextRecurringTask);
      }
      setTasks(updated);
    } catch (err) {
      console.warn('Error in handleToggleTask:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    try {
      const target = tasks.find((t) => t.id === id);
      if (target?.notificationId) {
        try {
          await cancelTaskNotification(target.notificationId);
        } catch (e) {
          console.warn('Failed to cancel notification:', e);
        }
      }
      const updated = await deleteTask(tasks, id);
      setTasks(updated);
    } catch (err) {
      console.warn('Error in handleDeleteTask:', err);
    }
  };

  // Edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  // Open details modal
  const handlePressTask = (task) => {
    setDetailsTask(task);
    setDetailsVisible(true);
  };

  // Update subtasks from details modal
  const handleUpdateSubtasks = async (taskId, newSubtasks, autoCompleted) => {
    try {
      let { updatedTasks } = await updateTaskSubtasks(
        tasks,
        taskId,
        newSubtasks
      );

      if (autoCompleted) {
        const target = tasks.find((t) => t.id === taskId);
        if (target?.notificationId) {
          try {
            await cancelTaskNotification(target.notificationId);
          } catch (e) {
            console.warn('Failed to cancel notification on auto-complete:', e);
          }
        }

        // If recurring task auto-completed, schedule next occurrence
        if (target && target.repeat && target.repeat !== 'none') {
          let nextRecurring = calculateNextOccurrence(target);
          if (settings.notificationsEnabled) {
            try {
              const nextNotifId = await scheduleTaskNotification(
                nextRecurring,
                settings
              );
              nextRecurring.notificationId = nextNotifId;
            } catch (e) {
              console.warn('Failed to schedule next recurring notification:', e);
            }
          }
          updatedTasks = await addTask(updatedTasks, nextRecurring);
        }
      }
      setTasks(updatedTasks);
    } catch (err) {
      console.warn('Error updating subtasks:', err);
    }
  };

  // Open modal for a specific date
  const handleAddNewTaskForDate = (dateObj) => {
    const target = new Date(dateObj);
    const now = new Date();
    const nextHour = (now.getHours() + 1) % 24;
    target.setHours(nextHour, 0, 0, 0);

    const dateKey = toLocalDateKey(target);
    setSelectedDateKey(dateKey);
    setEditingTask({
      startDate: target.toISOString(),
      dateTime: target.toISOString(),
      priority: 'medium',
    });
    setModalVisible(true);
  };

  // Update settings
  const handleUpdateSettings = async (newSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Clear completed tasks
  const handleClearCompleted = async () => {
    const updated = await clearCompletedTasks(tasks);
    setTasks(updated);
  };

  // Import backup data (merge or replace)
  const handleImportBackup = async (backupData, merge = false) => {
    try {
      const result = await importBackupData(tasks, backupData, merge);
      if (result.success) {
        setTasks(result.tasks);
        const updatedSettings = await loadSettings();
        setSettings(updatedSettings);
      }
      return result;
    } catch (err) {
      console.warn('Error importing backup:', err);
      return { success: false, message: err.message };
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: currentTheme.screenBg }]}>
      <StatusBar
        barStyle={currentTheme.statusBarStyle}
        backgroundColor={currentTheme.screenBg}
      />

      {/* Main Tab Content */}
      {activeTab === 'home' && (
        <View style={styles.tabContainer}>
          {/* App Header */}
          <View style={styles.appHeader}>
            <View>
              <Text style={[styles.appTitle, { color: currentTheme.textPrimary }]}>
                My Planner
              </Text>
              <Text style={[styles.appSubtitle, { color: currentTheme.textSecondary }]}>
                {allPendingCount > 0
                  ? `${allPendingCount} task${allPendingCount > 1 ? 's' : ''} pending`
                  : 'All caught up! 🎉'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isPro ? (
                <View
                  style={[
                    styles.proHeaderBadge,
                    { borderColor: accentColor, backgroundColor: accentColor + '22' },
                  ]}
                >
                  <Ionicons name="sparkles" size={12} color={accentColor} />
                  <Text style={[styles.proHeaderText, { color: accentColor }]}>
                    PRO
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.getProBtn,
                    { borderColor: accentColor, backgroundColor: accentColor + '15' },
                  ]}
                  onPress={() => setPaywallVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="diamond-outline" size={13} color={accentColor} />
                  <Text style={[styles.getProText, { color: accentColor }]}>
                    Get Pro
                  </Text>
                </TouchableOpacity>
              )}

              <View
                style={[
                  styles.offlinePill,
                  {
                    backgroundColor: currentTheme.cardBg,
                    borderColor: currentTheme.border,
                  },
                ]}
              >
                <View style={styles.offlineDot} />
                <Text
                  style={[
                    styles.offlinePillText,
                    { color: currentTheme.textSecondary },
                  ]}
                >
                  Offline
                </Text>
              </View>
            </View>
          </View>

          {/* Weekly Calendar Strip */}
          <WeekCalendarStrip
            selectedDateKey={selectedDateKey}
            onSelectDate={setSelectedDateKey}
            accentColor={accentColor}
            theme={currentTheme}
          />

          {/* Task List */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accentColor}
                colors={[accentColor]}
              />
            }
          >
            {/* Date Heading */}
            <Text style={[styles.dateHeading, { color: currentTheme.textPrimary }]}>
              {dateHeading}
            </Text>

            {/* Pending Section */}
            <SectionHeader
              title="Pending"
              count={pendingTasks.length}
              expanded
              iconName="list-outline"
              iconColor={accentColor}
              onToggle={() => {}}
              theme={currentTheme}
            />

            {pendingTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={48}
                  color={currentTheme.border}
                />
                <Text style={[styles.emptyText, { color: currentTheme.textMuted }]}>
                  No pending tasks
                </Text>
                <Text style={[styles.emptySubtext, { color: currentTheme.textMuted }]}>
                  Tap + to add a new task
                </Text>
              </View>
            ) : (
              pendingTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={handleToggleTask}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onPressTask={handlePressTask}
                  accentColor={accentColor}
                  theme={currentTheme}
                />
              ))
            )}

            {/* Completed Section */}
            {completedTasks.length > 0 && (
              <>
                <SectionHeader
                  title="Completed"
                  count={completedTasks.length}
                  expanded={completedExpanded}
                  iconName="checkmark-circle-outline"
                  iconColor={currentTheme.success}
                  onToggle={() => setCompletedExpanded((v) => !v)}
                  theme={currentTheme}
                />
                {completedExpanded &&
                  completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onToggle={handleToggleTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onPressTask={handlePressTask}
                      accentColor={accentColor}
                      theme={currentTheme}
                    />
                  ))}
              </>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      )}

      {activeTab === 'calendar' && (
        <View style={styles.tabContainer}>
          <CalendarScreen
            tasks={tasks}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={setSelectedDateKey}
            onToggleTask={handleToggleTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddNewTaskForDate={handleAddNewTaskForDate}
            onPressTask={handlePressTask}
            accentColor={accentColor}
            theme={currentTheme}
          />
        </View>
      )}

      {activeTab === 'stats' && (
        <View style={styles.tabContainer}>
          <StatsScreen
            tasks={tasks}
            accentColor={accentColor}
            theme={currentTheme}
          />
        </View>
      )}

      {activeTab === 'settings' && (
        <View style={styles.tabContainer}>
          <SettingsScreen
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClearCompletedTasks={handleClearCompleted}
            completedCount={allCompletedCount}
            totalCount={tasks.length}
            tasks={tasks}
            onImportBackup={handleImportBackup}
            activeThemeId={activeAccentId}
            activeBgId={activeBgId}
            isCozy={isCozy}
            onSelectTheme={handleSelectTheme}
            onSelectBg={handleSelectBg}
            onToggleCozy={handleToggleCozy}
            isPro={isPro}
            onOpenPaywall={() => setPaywallVisible(true)}
            onProStatusChanged={handleProStatusChanged}
            theme={currentTheme}
          />
        </View>
      )}

      {/* Bottom Nav Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: currentTheme.tabBarBg,
            borderTopColor: currentTheme.tabBarBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={
              activeTab === 'home' ? accentColor : currentTheme.tabInactive
            }
          />
          <Text
            style={[
              styles.navLabel,
              {
                color:
                  activeTab === 'home' ? accentColor : currentTheme.tabInactive,
              },
              activeTab === 'home' && { fontWeight: '700' },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('calendar')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'calendar' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={
              activeTab === 'calendar' ? accentColor : currentTheme.tabInactive
            }
          />
          <Text
            style={[
              styles.navLabel,
              {
                color:
                  activeTab === 'calendar'
                    ? accentColor
                    : currentTheme.tabInactive,
              },
              activeTab === 'calendar' && { fontWeight: '700' },
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>

        {/* FAB placeholder */}
        <View style={styles.fabPlaceholder} />

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('stats')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'stats' ? 'stats-chart' : 'stats-chart-outline'}
            size={22}
            color={
              activeTab === 'stats' ? accentColor : currentTheme.tabInactive
            }
          />
          <Text
            style={[
              styles.navLabel,
              {
                color:
                  activeTab === 'stats' ? accentColor : currentTheme.tabInactive,
              },
              activeTab === 'stats' && { fontWeight: '700' },
            ]}
          >
            Stats
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={22}
            color={
              activeTab === 'settings' ? accentColor : currentTheme.tabInactive
            }
          />
          <Text
            style={[
              styles.navLabel,
              {
                color:
                  activeTab === 'settings'
                    ? accentColor
                    : currentTheme.tabInactive,
              },
              activeTab === 'settings' && { fontWeight: '700' },
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Central Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: accentColor,
            shadowColor: accentColor,
          },
        ]}
        onPress={() => {
          setEditingTask(null);
          setModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color={currentTheme.textOnAccent} />
      </TouchableOpacity>

      {/* Task Add / Edit Modal */}
      <TaskModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        editTask={editingTask}
        defaultDateKey={selectedDateKey}
        accentColor={accentColor}
        theme={currentTheme}
        defaultReminderMinutes={settings?.reminderOffsetMinutes ?? 0}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        visible={detailsVisible}
        task={detailsTask}
        onClose={() => {
          setDetailsVisible(false);
          setDetailsTask(null);
        }}
        onEdit={(t) => {
          setDetailsVisible(false);
          setEditingTask(t);
          setModalVisible(true);
        }}
        onDelete={handleDeleteTask}
        onToggleComplete={handleToggleTask}
        onUpdateSubtasks={handleUpdateSubtasks}
        onTestWakeUp={(t) => {
          setWakeUpTask(t);
          setWakeUpModalVisible(true);
        }}
        accentColor={accentColor}
        theme={currentTheme}
      />

      {/* Heavy Sleeper Wake-Up Alarm Challenge Modal */}
      <WakeUpModal
        visible={wakeUpModalVisible}
        task={wakeUpTask}
        onDismiss={() => {
          setWakeUpModalVisible(false);
          setWakeUpTask(null);
        }}
        onCompleteTask={async (taskId) => {
          await handleToggleTask(taskId);
          setWakeUpModalVisible(false);
          setWakeUpTask(null);
        }}
        theme={currentTheme}
      />

      {/* Upgrade to Planner Pro Paywall Modal */}
      <ProPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSuccess={() => {
          setIsPro(true);
        }}
        currentThemeAccent={accentColor}
        theme={currentTheme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flex: 1,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  appTitle: {
    fontSize: FONTS.sizes.title,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  appSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  proHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  proHeaderText: {
    fontSize: 11,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  getProBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  getProText: {
    fontSize: 11,
    fontWeight: FONTS.weights.semibold,
  },
  offlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.success,
  },
  offlinePillText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  dateHeading: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textMuted,
    fontWeight: FONTS.weights.medium,
  },
  emptySubtext: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: SPACING.xs,
  },
  navLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  fabPlaceholder: {
    width: 68,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    width: 60,
    height: 60,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
});
