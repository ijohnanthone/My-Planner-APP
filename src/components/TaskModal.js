import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Keyboard,
  Switch,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  PRIORITY_CONFIG,
  TASK_ICONS,
  REPEAT_OPTIONS,
} from '../theme';
import {
  formatTime,
  formatDateLabel,
  parseLocalDateKey,
  toLocalDateKey,
} from '../utils';
import { triggerHaptic } from '../haptics';

export const TASK_REMINDER_OPTIONS = [
  { value: 0, label: 'At event', icon: 'alarm-outline' },
  { value: 5, label: '5m early', icon: 'time-outline' },
  { value: 10, label: '10m early', icon: 'time-outline' },
  { value: 15, label: '15m early', icon: 'time-outline' },
  { value: 30, label: '30m early', icon: 'time-outline' },
  { value: 60, label: '1h early', icon: 'hourglass-outline' },
  { value: -1, label: 'No alert', icon: 'notifications-off-outline' },
];

export function getReminderHelperText(dateObj, reminderMins) {
  if (reminderMins === -1) {
    return 'Silent: No notification alarm will sound for this task.';
  }
  const taskMs = dateObj ? new Date(dateObj).getTime() : Date.now();
  const nowMs = Date.now();
  const diffMinutes = Math.round((taskMs - nowMs) / 60000);

  if (reminderMins > 0 && diffMinutes > 0 && diffMinutes <= reminderMins) {
    return `Smart Alert: Task starts in ${diffMinutes}m. Will notify at start time (${formatTime(dateObj)}).`;
  }
  if (reminderMins === 0) {
    return `Will notify right at task start (${formatTime(dateObj)}).`;
  }
  const alertTime = new Date(taskMs - reminderMins * 60000);
  return `Will notify ${reminderMins}m before start (at ${formatTime(alertTime)}).`;
}

export default function TaskModal({
  visible,
  onClose,
  onSave,
  editTask,
  defaultDateKey,
  accentColor = COLORS.accent,
  theme,
  defaultReminderMinutes = 0,
}) {
  const accent = theme?.accent || accentColor;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const modalBg = theme?.modalBg || COLORS.card;
  const inputBg = theme?.inputBg || COLORS.inputBg;
  const border = theme?.border || COLORS.border;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;
  const cardBg = theme?.cardBg || COLORS.card;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState(new Date()); // Start Date & Time
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(null); // Optional Due Date / Deadline
  const [reminderMinutes, setReminderMinutes] = useState(defaultReminderMinutes ?? 0);
  const [priority, setPriority] = useState('medium');
  const [icon, setIcon] = useState('💻');
  const [customEmoji, setCustomEmoji] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [repeat, setRepeat] = useState('none');
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [wakeUpGuard, setWakeUpGuard] = useState(false);

  // Date/time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'time'
  const [pickerTarget, setPickerTarget] = useState('start'); // 'start' | 'due'

  const isEditing = !!(editTask && editTask.id);
  const scrollViewRef = useRef(null);
  const prevVisibleRef = useRef(false);

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

  // Populate fields when opening or switching tasks
  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    prevVisibleRef.current = visible;

    if (!visible) return;
    if (!isOpening && !editTask?.id) return;

    if (editTask) {
      setTitle(editTask.title || '');
      setDescription(editTask.description || '');
      const start = new Date(editTask.startDate || editTask.dateTime || Date.now());
      setDateTime(start);

      const editHasDue = Boolean(
        editTask.hasDueDate || editTask.dueDate || editTask.deadline
      );
      setHasDueDate(editHasDue);
      if (editHasDue && (editTask.dueDate || editTask.deadline)) {
        setDueDate(new Date(editTask.dueDate || editTask.deadline));
      } else {
        const defaultDue = new Date(start);
        defaultDue.setHours(defaultDue.getHours() + 2);
        setDueDate(defaultDue);
      }

      setPriority(editTask.priority || 'medium');
      setRepeat(editTask.repeat || 'none');
      setReminderMinutes(
        editTask.reminderMinutes !== undefined && editTask.reminderMinutes !== null
          ? editTask.reminderMinutes
          : (defaultReminderMinutes ?? 0)
      );
      setWakeUpGuard(Boolean(editTask.wakeUpGuard));
      setSubtasks(Array.isArray(editTask.subtasks) ? editTask.subtasks : []);

      // Icon matching
      const foundPreset = TASK_ICONS.find((t) => t.emoji === editTask.icon);
      if (foundPreset && foundPreset.id !== 'custom') {
        setIcon(editTask.icon);
        setIsCustomMode(false);
      } else if (editTask.icon) {
        setIcon('✨');
        setCustomEmoji(editTask.icon);
        setIsCustomMode(true);
      } else {
        setIcon('💻');
        setIsCustomMode(false);
      }
    } else {
      setTitle('');
      setDescription('');
      let base;
      if (defaultDateKey) {
        base = parseLocalDateKey(defaultDateKey);
        const now = new Date();
        const nextHour = (now.getHours() + 1) % 24;
        base.setHours(nextHour, 0, 0, 0);
      } else {
        base = new Date();
        const nextHour = (base.getHours() + 1) % 24;
        base.setHours(nextHour, 0, 0, 0);
      }
      setDateTime(base);
      setHasDueDate(false);
      const defaultDue = new Date(base);
      defaultDue.setHours(defaultDue.getHours() + 2);
      setDueDate(defaultDue);

      setReminderMinutes(defaultReminderMinutes ?? 0);
      setWakeUpGuard(false);
      setPriority('medium');
      setIcon('💻');
      setCustomEmoji('');
      setIsCustomMode(false);
      setRepeat('none');
      setSubtasks([]);
    }
    setNewSubtaskTitle('');
  }, [editTask, defaultDateKey, visible, defaultReminderMinutes]);

  const handleSelectIcon = (selected) => {
    triggerHaptic('light');
    if (selected.id === 'custom') {
      setIsCustomMode(true);
      setIcon('✨');
    } else {
      setIsCustomMode(false);
      setIcon(selected.emoji);
    }
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    triggerHaptic('light');
    const newItem = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
      title: trimmed,
      completed: false,
    };
    setSubtasks([...subtasks, newItem]);
    setNewSubtaskTitle('');
    scrollToSubtasksBottom();
  };

  const handleRemoveSubtask = (id) => {
    triggerHaptic('light');
    setSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const handleToggleSubtaskItem = (id) => {
    triggerHaptic('light');
    setSubtasks(
      subtasks.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a task title.');
      return;
    }

    // Determine final icon
    let finalIcon = icon;
    if (isCustomMode && customEmoji.trim()) {
      finalIcon = customEmoji.trim();
    }

    // Include any typed subtask before saving if not added
    let finalSubtasks = [...subtasks];
    if (newSubtaskTitle.trim()) {
      finalSubtasks.push({
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 4),
        title: newSubtaskTitle.trim(),
        completed: false,
      });
    }

    triggerHaptic('medium');
    onSave({
      title: title.trim(),
      description: description.trim(),
      startDate: dateTime.toISOString(),
      dateTime: dateTime.toISOString(), // Maintain backward compatibility
      hasDueDate,
      dueDate: hasDueDate && dueDate ? dueDate.toISOString() : null,
      priority,
      icon: finalIcon,
      repeat,
      subtasks: finalSubtasks,
      reminderMinutes,
      wakeUpGuard,
    });
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDateTime(new Date());
    setHasDueDate(false);
    setDueDate(null);
    setReminderMinutes(defaultReminderMinutes ?? 0);
    setWakeUpGuard(false);
    setPriority('medium');
    setIcon('💻');
    setCustomEmoji('');
    setIsCustomMode(false);
    setRepeat('none');
    setSubtasks([]);
    setNewSubtaskTitle('');
    setShowDatePicker(false);
    setShowTimePicker(false);
    onClose();
  };

  // Start Date & Time Pickers
  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      try {
        const pickerValue =
          dateTime instanceof Date && !isNaN(dateTime.getTime())
            ? dateTime
            : new Date();
        DateTimePickerAndroid.open({
          value: pickerValue,
          mode: 'date',
          is24Hour: false,
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            setDateTime((prev) => {
              const base = new Date(prev);
              const updated = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                base.getHours(),
                base.getMinutes(),
                0,
                0
              );
              return updated;
            });
          },
        });
      } catch (err) {
        if (__DEV__) console.warn('Error opening Android date picker:', err);
      }
    } else {
      setPickerTarget('start');
      setPickerMode('date');
      setShowDatePicker(true);
      setShowTimePicker(false);
    }
  };

  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      try {
        const pickerValue =
          dateTime instanceof Date && !isNaN(dateTime.getTime())
            ? dateTime
            : new Date();
        DateTimePickerAndroid.open({
          value: pickerValue,
          mode: 'time',
          is24Hour: false,
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            setDateTime((prev) => {
              const base = new Date(prev);
              const updated = new Date(
                base.getFullYear(),
                base.getMonth(),
                base.getDate(),
                selectedDate.getHours(),
                selectedDate.getMinutes(),
                0,
                0
              );
              return updated;
            });
          },
        });
      } catch (err) {
        if (__DEV__) console.warn('Error opening Android time picker:', err);
      }
    } else {
      setPickerTarget('start');
      setPickerMode('time');
      setShowTimePicker(true);
      setShowDatePicker(false);
    }
  };

  // Due Date & Time Pickers
  const openDueDatePicker = () => {
    if (Platform.OS === 'android') {
      try {
        const pickerValue =
          dueDate instanceof Date && !isNaN(dueDate.getTime())
            ? dueDate
            : new Date(dateTime);
        DateTimePickerAndroid.open({
          value: pickerValue,
          mode: 'date',
          is24Hour: false,
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            setDueDate((prev) => {
              const base =
                prev instanceof Date && !isNaN(prev.getTime())
                  ? prev
                  : new Date(dateTime);
              return new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                base.getHours(),
                base.getMinutes(),
                0,
                0
              );
            });
          },
        });
      } catch (err) {
        if (__DEV__) console.warn('Error opening Android due date picker:', err);
      }
    } else {
      setPickerTarget('due');
      setPickerMode('date');
      setShowDatePicker(true);
      setShowTimePicker(false);
    }
  };

  const openDueTimePicker = () => {
    if (Platform.OS === 'android') {
      try {
        const pickerValue =
          dueDate instanceof Date && !isNaN(dueDate.getTime())
            ? dueDate
            : new Date(dateTime);
        DateTimePickerAndroid.open({
          value: pickerValue,
          mode: 'time',
          is24Hour: false,
          onChange: (event, selectedDate) => {
            if (event.type === 'dismissed' || !selectedDate) return;
            setDueDate((prev) => {
              const base =
                prev instanceof Date && !isNaN(prev.getTime())
                  ? prev
                  : new Date(dateTime);
              return new Date(
                base.getFullYear(),
                base.getMonth(),
                base.getDate(),
                selectedDate.getHours(),
                selectedDate.getMinutes(),
                0,
                0
              );
            });
          },
        });
      } catch (err) {
        if (__DEV__) console.warn('Error opening Android due time picker:', err);
      }
    } else {
      setPickerTarget('due');
      setPickerMode('time');
      setShowTimePicker(true);
      setShowDatePicker(false);
    }
  };

  const onPickerChange = (event, selectedDate) => {
    if (event.type === 'dismissed' || !selectedDate) return;

    if (pickerTarget === 'due') {
      setDueDate((prev) => {
        const base =
          prev instanceof Date && !isNaN(prev.getTime())
            ? prev
            : new Date(dateTime);
        if (pickerMode === 'date') {
          return new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            base.getHours(),
            base.getMinutes(),
            0,
            0
          );
        } else {
          return new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            selectedDate.getHours(),
            selectedDate.getMinutes(),
            0,
            0
          );
        }
      });
    } else {
      setDateTime((prev) => {
        const base = new Date(prev);
        if (pickerMode === 'date') {
          return new Date(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
            base.getHours(),
            base.getMinutes(),
            0,
            0
          );
        } else {
          return new Date(
            base.getFullYear(),
            base.getMonth(),
            base.getDate(),
            selectedDate.getHours(),
            selectedDate.getMinutes(),
            0,
            0
          );
        }
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior="padding"
      >
        <TouchableOpacity
          style={styles.backdropHit}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={[styles.sheet, { backgroundColor: modalBg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <View style={[styles.handle, { backgroundColor: border }]} />
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {isEditing ? 'Edit Task' : 'New Task'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Task Title Input */}
            <Text style={[styles.label, { color: textSecondary }]}>Task Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
              placeholder="Enter task title..."
              placeholderTextColor={textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              returnKeyType="next"
            />

            {/* Custom Category Icon Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>Category Icon</Text>
            <View style={styles.iconsRow}>
              {TASK_ICONS.map((item) => {
                const isSelected =
                  (item.id === 'custom' && isCustomMode) ||
                  (!isCustomMode && icon === item.emoji);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.iconOption,
                      { backgroundColor: cardBg, borderColor: border },
                      isSelected && [styles.iconOptionSelected, { borderColor: accent, backgroundColor: accent + '18' }],
                    ]}
                    onPress={() => handleSelectIcon(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.iconEmoji}>{item.emoji}</Text>
                    <Text
                      style={[
                        styles.iconLabel,
                        { color: textSecondary },
                        isSelected && [styles.iconLabelSelected, { color: accent }],
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Emoji Input when 'Custom' is selected */}
            {isCustomMode && (
              <View style={[styles.customEmojiBox, { backgroundColor: inputBg, borderColor: border }]}>
                <Text style={[styles.customEmojiPrompt, { color: textSecondary }]}>Enter any emoji:</Text>
                <TextInput
                  style={[styles.customEmojiInput, { color: textPrimary }]}
                  placeholder="e.g. 🎯, 🚀, ☕"
                  placeholderTextColor={textMuted}
                  value={customEmoji}
                  onChangeText={setCustomEmoji}
                  maxLength={6}
                />
              </View>
            )}

            {/* Priority Selector */}
            <Text style={[styles.label, { color: textSecondary, marginTop: SPACING.md }]}>
              Priority Level
            </Text>
            <View style={styles.priorityRow}>
              {['high', 'medium', 'low'].map((pKey) => {
                const config = PRIORITY_CONFIG[pKey];
                const isSelected = priority === pKey;
                return (
                  <TouchableOpacity
                    key={pKey}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: cardBg, borderColor: border },
                      isSelected && {
                        backgroundColor: config.color,
                        borderColor: config.color,
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic('light');
                      setPriority(pKey);
                    }}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.priorityIndicatorDot,
                        {
                          backgroundColor: isSelected
                            ? '#FFFFFF'
                            : config.color,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: textSecondary },
                        isSelected && [styles.priorityOptionTextSelected, { color: '#FFFFFF' }],
                      ]}
                    >
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Recurring Task Selector */}
            <Text style={[styles.label, { color: textSecondary }]}>Repeat Schedule</Text>
            <View style={styles.repeatRow}>
              {REPEAT_OPTIONS.map((opt) => {
                const isSelected = repeat === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.repeatOption,
                      { backgroundColor: cardBg, borderColor: border },
                      isSelected && [styles.repeatOptionSelected, { backgroundColor: accent, borderColor: accent }],
                    ]}
                    onPress={() => {
                      triggerHaptic('light');
                      setRepeat(opt.id);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={
                        opt.id === 'none'
                          ? 'close-circle-outline'
                          : 'repeat-outline'
                      }
                      size={14}
                      color={isSelected ? textOnAccent : textSecondary}
                    />
                    <Text
                      style={[
                        styles.repeatOptionText,
                        { color: textSecondary },
                        isSelected && [styles.repeatOptionTextSelected, { color: textOnAccent }],
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Description Input */}
            <Text style={[styles.label, { color: textSecondary, marginTop: SPACING.md }]}>
              Description / Notes (optional)
            </Text>
            <TextInput
              style={[styles.input, styles.inputMultiline, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
              placeholder="Add details, notes, links..."
              placeholderTextColor={textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={400}
              textAlignVertical="top"
            />

            {/* Subtasks / Checklist Section */}
            <View style={styles.subtasksHeaderRow}>
              <Text style={[styles.label, { color: textSecondary }]}>Checklist / Subtasks</Text>
              {subtasks.length > 0 && (
                <Text style={[styles.subtaskCountLabel, { color: accent }]}>
                  {subtasks.filter((s) => s.completed).length}/{subtasks.length}
                </Text>
              )}
            </View>

            {/* Subtask Input Row */}
            <View style={styles.addSubtaskRow}>
              <TextInput
                style={[styles.subtaskInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
                placeholder="Add subtask item..."
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

            {/* Subtasks List */}
            {subtasks.length > 0 && (
              <View style={[styles.subtasksContainer, { backgroundColor: cardBg, borderColor: border }]}>
                {subtasks.map((item, index) => (
                  <View key={item.id || index} style={[styles.subtaskItemRow, { borderBottomColor: border }]}>
                    <TouchableOpacity
                      style={styles.subtaskCheckBtn}
                      onPress={() => handleToggleSubtaskItem(item.id)}
                    >
                      <Ionicons
                        name={
                          item.completed
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                        }
                        size={18}
                        color={
                          item.completed ? (theme?.success || COLORS.success) : textMuted
                        }
                      />
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.subtaskItemText,
                        { color: textPrimary },
                        item.completed && [styles.subtaskItemTextDone, { color: textMuted }],
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.subtaskDeleteBtn}
                      onPress={() => handleRemoveSubtask(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={COLORS.danger}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Start Date & Time Row */}
            <Text style={[styles.label, { color: textSecondary, marginTop: SPACING.md }]}>
              Start Date & Time (Calendar & Reminder) *
            </Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateTimeBtn, { backgroundColor: cardBg, borderColor: border }]}
                onPress={openDatePicker}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={accent}
                  style={{ marginRight: SPACING.sm }}
                />
                <Text style={[styles.dateTimeBtnText, { color: textPrimary }]}>
                  {formatDateLabel(dateTime)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateTimeBtn, { backgroundColor: cardBg, borderColor: border }]}
                onPress={openTimePicker}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time"
                  size={18}
                  color={accent}
                  style={{ marginRight: SPACING.sm }}
                />
                <Text style={[styles.dateTimeBtnText, { color: textPrimary }]}>
                  {formatTime(dateTime)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reminder Alert Selector */}
            <View style={styles.reminderSectionHeader}>
              <View style={styles.reminderSectionLeft}>
                <Ionicons
                  name={reminderMinutes === -1 ? 'notifications-off-outline' : 'notifications-outline'}
                  size={16}
                  color={accent}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.label, { color: textSecondary, marginBottom: 0 }]}>
                  Reminder Alert
                </Text>
              </View>
              <View style={[styles.reminderActiveBadge, { backgroundColor: inputBg, borderColor: border }]}>
                <Text style={[styles.reminderActiveBadgeText, { color: accent }]}>
                  {TASK_REMINDER_OPTIONS.find((o) => o.value === reminderMinutes)?.label || 'At event'}
                </Text>
              </View>
            </View>

            {/* Reminder Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reminderChipsRow}
            >
              {TASK_REMINDER_OPTIONS.map((opt) => {
                const isSelected = reminderMinutes === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.reminderChip,
                      { backgroundColor: cardBg, borderColor: border },
                      isSelected && {
                        backgroundColor: accent,
                        borderColor: accent,
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setReminderMinutes(opt.value);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={13}
                      color={isSelected ? textOnAccent : textSecondary}
                      style={{ marginRight: 5 }}
                    />
                    <Text
                      style={[
                        styles.reminderChipText,
                        { color: textPrimary },
                        isSelected && { color: textOnAccent, fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Live Helper Status Banner */}
            <View style={[styles.reminderHelperCard, { backgroundColor: inputBg, borderColor: border }]}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={accent}
                style={{ marginRight: 6, marginTop: 1 }}
              />
              <Text style={[styles.reminderHelperText, { color: textMuted }]}>
                {getReminderHelperText(dateTime, reminderMinutes)}
              </Text>
            </View>

            {/* Optional Due Date / Deadline Switch Toggle */}
            <View style={[styles.dueDateToggleCard, { backgroundColor: inputBg, borderColor: border }]}>
              <View style={styles.dueDateToggleLeft}>
                <Ionicons
                  name="flag-outline"
                  size={20}
                  color={hasDueDate ? accent : textSecondary}
                />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={[styles.dueDateToggleTitle, { color: textPrimary }]}>
                    Add Due Date / Deadline
                  </Text>
                  <Text style={[styles.dueDateToggleSubtitle, { color: textMuted }]}>
                    Track separate target deadline & overdue status
                  </Text>
                </View>
              </View>
              <Switch
                value={hasDueDate}
                onValueChange={(val) => {
                  triggerHaptic('light');
                  setHasDueDate(val);
                  if (val && !dueDate) {
                    const defaultDue = new Date(dateTime);
                    defaultDue.setHours(defaultDue.getHours() + 2);
                    setDueDate(defaultDue);
                  }
                }}
                trackColor={{ false: border, true: accent }}
                thumbColor={hasDueDate ? textOnAccent : '#F4F3F4'}
              />
            </View>

            {/* Due Date & Time Pickers (Visible when hasDueDate is ON) */}
            {hasDueDate && (
              <View style={styles.dueDateSection}>
                <Text style={[styles.label, { color: textSecondary, marginTop: SPACING.sm }]}>
                  Due Date & Deadline Time
                </Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={[styles.dateTimeBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={openDueDatePicker}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={accent}
                      style={{ marginRight: SPACING.sm }}
                    />
                    <Text style={[styles.dateTimeBtnText, { color: textPrimary }]}>
                      {dueDate ? formatDateLabel(dueDate) : formatDateLabel(dateTime)}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateTimeBtn, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={openDueTimePicker}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={18}
                      color={accent}
                      style={{ marginRight: SPACING.sm }}
                    />
                    <Text style={[styles.dateTimeBtnText, { color: textPrimary }]}>
                      {dueDate ? formatTime(dueDate) : formatTime(dateTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Wake-Up Guard (Heavy Sleeper Alarm) Toggle */}
            <View style={[styles.dueDateToggleCard, { backgroundColor: inputBg, borderColor: border, marginTop: SPACING.xs }]}>
              <View style={styles.dueDateToggleLeft}>
                <Ionicons
                  name={wakeUpGuard ? 'eye' : 'eye-outline'}
                  size={22}
                  color={wakeUpGuard ? (theme?.danger || COLORS.danger) : textSecondary}
                />
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.dueDateToggleTitle, { color: textPrimary }]}>
                      Wake-Up Guard
                    </Text>
                    <View style={[styles.guardBadge, { backgroundColor: (theme?.danger || COLORS.danger) + '20', borderColor: theme?.danger || COLORS.danger }]}>
                      <Text style={[styles.guardBadgeText, { color: theme?.danger || COLORS.danger }]}>
                        HEAVY SLEEPER
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.dueDateToggleSubtitle, { color: textMuted }]}>
                    5 repeated alarm bursts (Morning Flower) + math puzzle to disarm
                  </Text>
                </View>
              </View>
              <Switch
                value={wakeUpGuard}
                onValueChange={(val) => {
                  triggerHaptic('light');
                  setWakeUpGuard(val);
                }}
                trackColor={{ false: border, true: theme?.danger || COLORS.danger }}
                thumbColor={wakeUpGuard ? '#FFFFFF' : '#F4F3F4'}
              />
            </View>

            {/* iOS inline picker */}
            {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
              <View style={{ alignItems: 'flex-end', marginBottom: SPACING.xs }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                  style={{ paddingVertical: 4, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: accent, fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={pickerTarget === 'due' ? (dueDate || dateTime) : dateTime}
                  mode="date"
                  display="inline"
                  onChange={onPickerChange}
                  themeVariant={theme?.isLight ? 'light' : 'dark'}
                  accentColor={accent}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: RADIUS.lg,
                  }}
                />
              </View>
            )}
            {Platform.OS === 'ios' && showTimePicker && (
              <View style={styles.iosPickerWrapper}>
                <DateTimePicker
                  value={pickerTarget === 'due' ? (dueDate || dateTime) : dateTime}
                  mode="time"
                  display="spinner"
                  onChange={onPickerChange}
                  themeVariant={theme?.isLight ? 'light' : 'dark'}
                  accentColor={accent}
                  style={{
                    backgroundColor: cardBg,
                    borderRadius: RADIUS.lg,
                  }}
                />
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: accent }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isEditing ? 'checkmark-circle' : 'add-circle'}
                size={20}
                color={textOnAccent}
                style={{ marginRight: SPACING.sm }}
              />
              <Text style={[styles.saveBtnText, { color: textOnAccent }]}>
                {isEditing ? 'Save Changes' : 'Add Task'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: SPACING.xxxl }} />
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
    minHeight: 480,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    position: 'relative',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  closeBtn: {
    position: 'absolute',
    right: SPACING.lg,
    top: SPACING.md + 4 + SPACING.sm,
    padding: SPACING.xs,
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  iconOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  iconOptionSelected: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  iconEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  iconLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  iconLabelSelected: {
    color: COLORS.accent,
    fontWeight: FONTS.weights.bold,
  },
  customEmojiBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  customEmojiPrompt: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  customEmojiInput: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    flex: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    gap: SPACING.xs,
  },
  priorityIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  priorityOptionText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  priorityOptionTextSelected: {
    color: '#121212',
    fontWeight: FONTS.weights.bold,
  },
  repeatRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  repeatOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 4,
  },
  repeatOptionSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  repeatOptionText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.semibold,
  },
  repeatOptionTextSelected: {
    color: '#121212',
    fontWeight: FONTS.weights.bold,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    minHeight: 70,
    paddingTop: SPACING.md,
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  subtaskCountLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.accent,
    fontWeight: FONTS.weights.bold,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  subtaskInput: {
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
  subtasksContainer: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '44',
  },
  subtaskCheckBtn: {
    paddingRight: SPACING.sm,
  },
  subtaskItemText: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONTS.sizes.sm,
  },
  subtaskItemTextDone: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  subtaskDeleteBtn: {
    padding: SPACING.xs,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  dueDateToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.md,
  },
  dueDateToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SPACING.sm,
  },
  dueDateToggleTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  dueDateToggleSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  guardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  guardBadgeText: {
    fontSize: 9,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  dueDateSection: {
    marginBottom: SPACING.xs,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  dateTimeBtnText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    fontWeight: FONTS.weights.medium,
  },
  iosPickerWrapper: {
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  saveBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#121212',
  },
  reminderSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  reminderSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderActiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  reminderActiveBadgeText: {
    fontSize: 11,
    fontWeight: FONTS.weights.bold,
  },
  reminderChipsRow: {
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: 6,
  },
  reminderChipText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
  reminderHelperCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  reminderHelperText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
