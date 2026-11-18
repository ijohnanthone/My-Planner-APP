import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  APP_BACKGROUNDS,
  APP_ACCENTS,
  getBackgroundById,
  getAccentById,
} from '../theme';
import { triggerHaptic } from '../haptics';
import {
  NOTIFICATION_SOUNDS,
  getSoundOption,
  scheduleTestNotification,
} from '../notifications';
import { unlockWithPromoCode, resetProStatusForDev } from '../billing';

const REMINDER_OPTIONS = [
  { label: 'At event', minutes: 0 },
  { label: '5m before', minutes: 5 },
  { label: '10m before', minutes: 10 },
  { label: '15m before', minutes: 15 },
  { label: '30m before', minutes: 30 },
  { label: '1h before', minutes: 60 },
];

export default function SettingsScreen({
  tasks = [],
  settings,
  onUpdateSettings,
  onClearCompletedTasks,
  onImportBackup,
  completedCount,
  totalCount,
  activeThemeId = 'gold',
  activeBgId = 'midnight',
  isCozy = false,
  onSelectTheme,
  onSelectBg,
  onToggleCozy,
  isPro = false,
  onOpenPaywall,
  onProStatusChanged,
  theme,
}) {
  const accentColor = theme?.accent || COLORS.accent;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const screenBg = theme?.screenBg || COLORS.background;
  const cardBg = theme?.cardBg || COLORS.card;
  const cardElevated = theme?.cardElevated || COLORS.cardElevated;
  const border = theme?.border || COLORS.border;
  const inputBg = theme?.inputBg || COLORS.inputBg;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;

  const activeSoundId = settings?.selectedSoundId || 'chime';
  const activeSoundOpt = getSoundOption(activeSoundId);

  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importText, setImportText] = useState('');
  const [testingNotification, setTestingNotification] = useState(false);

  const [vipCode, setVipCode] = useState('');
  const [redeemingVip, setRedeemingVip] = useState(false);

  const handlePressBg = (bg) => {
    if (bg.isPro && !isPro) {
      triggerHaptic('warning');
      if (onOpenPaywall) onOpenPaywall();
    } else {
      triggerHaptic('light');
      if (onSelectBg) onSelectBg(bg.id);
    }
  };

  const handlePressAccent = (acc) => {
    if (acc.isPro && !isPro) {
      triggerHaptic('warning');
      if (onOpenPaywall) onOpenPaywall();
    } else {
      triggerHaptic('light');
      if (onSelectTheme) onSelectTheme(acc.id);
    }
  };

  const handleRedeemVip = async () => {
    if (!vipCode.trim()) {
      Alert.alert('Empty Code', 'Please enter a VIP or Promo code.');
      return;
    }
    try {
      setRedeemingVip(true);
      const res = await unlockWithPromoCode(vipCode);
      if (res.success) {
        triggerHaptic('success');
        setVipCode('');
        onProStatusChanged && onProStatusChanged(true);
        Alert.alert('🎉 VIP Unlocked!', res.message);
      } else {
        triggerHaptic('warning');
        Alert.alert('Redeem Notice', res.message);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRedeemingVip(false);
    }
  };

  const handleResetPro = async () => {
    Alert.alert(
      'Developer: Reset Pro Status',
      'Reset Pro status back to Free and revert background to Midnight Dark and accent to Gold?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset to Free',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('warning');
            await resetProStatusForDev();
            onProStatusChanged && onProStatusChanged(false);
            onSelectBg && onSelectBg('midnight');
            onSelectTheme && onSelectTheme('gold');
            onToggleCozy && onToggleCozy(false);
            Alert.alert(
              'Reset Complete',
              'Pro status has been reset to Free (Midnight Dark + Gold theme active).'
            );
          },
        },
      ]
    );
  };

  const handleToggleNotifications = (val) => {
    triggerHaptic('light');
    onUpdateSettings({
      ...settings,
      notificationsEnabled: val,
    });
  };

  const handleSelectReminder = (minutes) => {
    triggerHaptic('light');
    onUpdateSettings({
      ...settings,
      reminderOffsetMinutes: minutes,
    });
  };

  const handleSelectSound = (soundId) => {
    triggerHaptic('light');
    onUpdateSettings({
      ...settings,
      selectedSoundId: soundId,
    });
  };

  const handleTestNotification = async (targetSoundId) => {
    const soundToTest = targetSoundId || settings?.selectedSoundId || 'chime';
    try {
      triggerHaptic('medium');
      setTestingNotification(true);
      const res = await scheduleTestNotification(soundToTest);
      if (res.success) {
        triggerHaptic('success');
        Alert.alert(
          '🔔 Tone Preview Scheduled!',
          `Previewing "${res.soundName}". It will fire in 2 seconds with vibration and interactive buttons:\n• "Mark Complete"\n• "Snooze 10m"\n\nYou can pull down your notification tray or minimize the app to test it!`
        );
      } else {
        triggerHaptic('warning');
        Alert.alert(
          'Notification Test Notice',
          res.message || 'Could not schedule test alert. Please check permissions.'
        );
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setTestingNotification(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = async () => {
    try {
      triggerHaptic('light');
      const backupPayload = {
        version: '1.0.2',
        exportedAt: new Date().toISOString(),
        totalTasks: tasks.length,
        tasks: tasks,
        settings: settings,
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      await Clipboard.setStringAsync(jsonString);

      try {
        await Share.share({
          message: jsonString,
          title: 'My Planner Backup',
        });
      } catch (shareErr) {
        // Share dismiss or cancel is fine
      }

      triggerHaptic('success');
      Alert.alert(
        'Backup Exported!',
        `Successfully exported ${tasks.length} task(s).\n\nThe backup JSON has been copied to your clipboard and opened in the Share menu. Keep it safe to restore on any phone!`
      );
    } catch (err) {
      Alert.alert('Export Failed', 'Error creating backup: ' + err.message);
    }
  };

  // Quick paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (!clipboardContent || !clipboardContent.trim()) {
        Alert.alert('Clipboard Empty', 'No text found on your clipboard.');
        return;
      }
      setImportText(clipboardContent);
      triggerHaptic('light');
    } catch (err) {
      Alert.alert('Error', 'Could not read clipboard.');
    }
  };

  // Perform import
  const handleExecuteImport = async (merge) => {
    if (!importText.trim()) {
      Alert.alert('Input Required', 'Please paste your backup JSON first.');
      return;
    }

    const result = await onImportBackup(importText, merge);
    if (result.success) {
      triggerHaptic('success');
      setImportModalVisible(false);
      setImportText('');
      Alert.alert('Import Successful', result.message);
    } else {
      triggerHaptic('warning');
      Alert.alert('Import Failed', result.message);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: textPrimary }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>Preferences, themes & backup</Text>
      </View>

      {/* Theme & Appearance Section */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.themeSectionHeader}>
          <View style={styles.sectionTitleRowInline}>
            <Ionicons name="color-palette" size={20} color={accentColor} />
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Theme & Appearance</Text>
          </View>
          <View
            style={[
              styles.proStatusBadge,
              isPro
                ? { backgroundColor: accentColor + '22', borderColor: accentColor }
                : { backgroundColor: inputBg, borderColor: border },
            ]}
          >
            <Ionicons
              name={isPro ? 'sparkles' : 'lock-closed'}
              size={12}
              color={isPro ? accentColor : textSecondary}
            />
            <Text
              style={[
                styles.proStatusBadgeText,
                isPro ? { color: accentColor } : { color: textSecondary },
              ]}
            >
              {isPro ? 'VIP PRO' : 'FREE'}
            </Text>
          </View>
        </View>

        <Text style={[styles.settingDesc, { color: textSecondary }]}>
          Curated low-glare matte pastels & dark tones. Mix and match your app background and accent color.
        </Text>

        {/* 1. Background Palette Picker */}
        <Text style={[styles.subLabel, { color: textPrimary, marginTop: SPACING.md }]}>
          App Background Color
        </Text>
        <View style={styles.swatchGrid}>
          {APP_BACKGROUNDS.map((bg) => {
            const isSelected = activeBgId === bg.id;
            const isLocked = bg.isPro && !isPro;

            return (
              <TouchableOpacity
                key={bg.id}
                style={[
                  styles.bgSwatchCard,
                  { backgroundColor: bg.card, borderColor: isSelected ? accentColor : border },
                  isSelected && { borderWidth: 2 },
                ]}
                onPress={() => handlePressBg(bg)}
                activeOpacity={0.8}
              >
                <View style={[styles.bgSwatchCircle, { backgroundColor: bg.base, borderColor: border }]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={15} color={bg.isLight ? '#27252B' : '#FAFAFA'} />
                  )}
                  {isLocked && !isSelected && (
                    <Ionicons name="lock-closed" size={12} color={bg.isLight ? '#6B6570' : '#A0A0A0'} />
                  )}
                </View>
                <Text
                  style={[
                    styles.bgSwatchName,
                    { color: isSelected ? accentColor : (bg.isLight && theme?.isLight ? '#27252B' : textPrimary) },
                    isSelected && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {bg.name}
                </Text>
                <Text style={[styles.bgSwatchBadge, { color: textMuted }]}>
                  {bg.isPro ? 'PRO' : 'FREE'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Accent Color Picker */}
        <Text style={[styles.subLabel, { color: textPrimary, marginTop: SPACING.lg }]}>
          Accent Color
        </Text>
        <View style={styles.swatchGrid}>
          {APP_ACCENTS.map((acc) => {
            const isSelected = activeThemeId === acc.id;
            const isLocked = acc.isPro && !isPro;

            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.accentSwatchCard,
                  { backgroundColor: inputBg, borderColor: isSelected ? acc.accent : border },
                  isSelected && { borderWidth: 2 },
                ]}
                onPress={() => handlePressAccent(acc)}
                activeOpacity={0.8}
              >
                <View style={[styles.accentColorDot, { backgroundColor: acc.accent }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#09090B" />}
                  {isLocked && !isSelected && <Ionicons name="lock-closed" size={11} color="#09090B" />}
                </View>
                <Text
                  style={[
                    styles.accentSwatchName,
                    { color: isSelected ? acc.accent : textPrimary },
                    isSelected && { fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {acc.name}
                </Text>
                <Text style={[styles.accentSwatchBadge, { color: textMuted }]}>
                  {acc.isPro ? 'PRO' : 'FREE'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Extra Cozy / Dim Mode Toggle */}
        <View style={[styles.cozyToggleRow, { borderTopColor: border }]}>
          <View style={styles.settingTextWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="moon-outline" size={16} color={accentColor} />
              <Text style={[styles.settingLabel, { color: textPrimary }]}>Extra Cozy / Dim Mode</Text>
            </View>
            <Text style={[styles.settingDesc, { color: textSecondary }]}>
              Softens pastel brightness and contrast for relaxing night viewing
            </Text>
          </View>
          <Switch
            value={isCozy}
            onValueChange={(val) => {
              triggerHaptic('light');
              onToggleCozy && onToggleCozy(val);
            }}
            trackColor={{ false: border, true: accentColor }}
            thumbColor={isCozy ? textOnAccent : '#888'}
          />
        </View>

        {/* Upgrade Banner if not Pro */}
        {!isPro && (
          <TouchableOpacity
            style={[styles.upgradeBannerBtn, { borderColor: accentColor, backgroundColor: accentColor + '12' }]}
            onPress={onOpenPaywall}
            activeOpacity={0.8}
          >
            <View style={styles.upgradeBannerLeft}>
              <Ionicons name="diamond" size={18} color={accentColor} />
              <View>
                <Text style={[styles.upgradeBannerTitle, { color: accentColor }]}>
                  Upgrade to Planner Pro (₱99)
                </Text>
                <Text style={[styles.upgradeBannerSub, { color: textSecondary }]}>
                  Pastel themes, soft tones, custom accents & chime alerts
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={accentColor} />
          </TouchableOpacity>
        )}

        {/* Secret VIP Promo Code Input */}
        <View style={styles.vipCodeBox}>
          <Text style={[styles.subLabel, { color: textSecondary }]}>Redeem VIP / Promo Code</Text>
          <View style={styles.vipInputRow}>
            <TextInput
              style={[styles.vipInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
              placeholder="Enter code"
              placeholderTextColor={textMuted}
              value={vipCode}
              onChangeText={setVipCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={[
                styles.vipRedeemBtn,
                { backgroundColor: accentColor },
              ]}
              onPress={handleRedeemVip}
              disabled={redeemingVip}
              activeOpacity={0.8}
            >
              <Text style={[styles.vipRedeemBtnText, { color: textOnAccent }]}>
                {redeemingVip ? '...' : 'Redeem'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="notifications" size={18} color={accentColor} />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Offline Notifications</Text>
        </View>

        {/* Toggle switch */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextWrap}>
            <Text style={[styles.settingLabel, { color: textPrimary }]}>Task Reminders</Text>
            <Text style={[styles.settingDesc, { color: textSecondary }]}>
              Receive local alerts on this device before deadlines
            </Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: border, true: accentColor }}
            thumbColor={settings.notificationsEnabled ? textOnAccent : '#888'}
          />
        </View>

        {/* Default Reminder Time */}
        {settings.notificationsEnabled && (
          <View style={styles.reminderTimeBlock}>
            <Text style={[styles.subLabel, { color: textPrimary }]}>Default Reminder for New Tasks</Text>
            <Text style={{ fontSize: 11, color: textMuted, marginTop: -4, marginBottom: SPACING.sm }}>
              Pre-selected reminder when creating tasks. You can adjust or mute reminders per task.
            </Text>
            <View style={styles.reminderOptions}>
              {REMINDER_OPTIONS.map((opt) => {
                const isSelected =
                  settings.reminderOffsetMinutes === opt.minutes;
                return (
                  <TouchableOpacity
                    key={opt.minutes}
                    style={[
                      styles.reminderBtn,
                      { backgroundColor: inputBg, borderColor: border },
                      isSelected && [styles.reminderBtnSelected, { backgroundColor: accentColor, borderColor: accentColor }],
                    ]}
                    onPress={() => handleSelectReminder(opt.minutes)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={16}
                      color={isSelected ? textOnAccent : textSecondary}
                    />
                    <Text
                      style={[
                        styles.reminderBtnText,
                        { color: textSecondary },
                        isSelected && [styles.reminderBtnTextSelected, { color: textOnAccent }],
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selectable Notification Sound / Tone (8 Choices) */}
            <View style={{ marginTop: SPACING.md }}>
              <Text style={[styles.subLabel, { color: textPrimary }]}>
                Alarm Tone & Alert Sound
              </Text>
              <Text style={[styles.settingDesc, { color: textSecondary, marginBottom: SPACING.sm }]}>
                Choose your alert melody or silent vibration pulse
              </Text>

              <View style={styles.soundOptionsList}>
                {NOTIFICATION_SOUNDS.map((snd) => {
                  const isSelected = activeSoundId === snd.id;
                  return (
                    <TouchableOpacity
                      key={snd.id}
                      style={[
                        styles.soundOptionCard,
                        { backgroundColor: inputBg, borderColor: border },
                        isSelected && {
                          borderColor: accentColor,
                          backgroundColor: theme?.isLight ? accentColor + '18' : accentColor + '20',
                        },
                      ]}
                      onPress={() => handleSelectSound(snd.id)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.soundOptionLeft}>
                        <View
                          style={[
                            styles.soundIconWrap,
                            {
                              backgroundColor: isSelected ? accentColor : cardBg,
                            },
                          ]}
                        >
                          <Ionicons
                            name={snd.icon}
                            size={16}
                            color={isSelected ? textOnAccent : textSecondary}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text
                              style={[
                                styles.soundOptionName,
                                { color: textPrimary },
                                isSelected && { color: accentColor, fontWeight: '700' },
                              ]}
                            >
                              {snd.name}
                            </Text>
                            {snd.isSilent && (
                              <View style={[styles.silentPill, { backgroundColor: cardBg, borderColor: border }]}>
                                <Text style={[styles.silentPillText, { color: textMuted }]}>Vibrate Only</Text>
                              </View>
                            )}
                            {snd.isHeavySleeper && (
                              <View style={[styles.silentPill, { backgroundColor: (theme?.danger || COLORS.danger) + '20', borderColor: theme?.danger || COLORS.danger }]}>
                                <Text style={[styles.silentPillText, { color: theme?.danger || COLORS.danger, fontWeight: '700' }]}>Heavy Sleeper</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.soundOptionDesc, { color: textMuted }]}>
                            {snd.desc}
                          </Text>
                        </View>
                      </View>

                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={isSelected ? accentColor : border}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Test Selected Tone (3s) Preview Button & Channel Info */}
            <View style={[styles.testAlertBox, { backgroundColor: inputBg, borderColor: border, marginTop: SPACING.md }]}>
              <View style={styles.channelBadgeRow}>
                <View style={[styles.channelBadge, { backgroundColor: cardBg }]}>
                  <Ionicons name="musical-notes" size={12} color={accentColor} />
                  <Text style={[styles.channelBadgeText, { color: textSecondary }]}>
                    Active: {activeSoundOpt.name}
                  </Text>
                </View>
                <View style={[styles.channelBadge, { backgroundColor: cardBg }]}>
                  <Ionicons name="radio" size={12} color="#60A5FA" />
                  <Text style={[styles.channelBadgeText, { color: textSecondary }]}>
                    Channel: {activeSoundOpt.channelId}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.testAlertBtn,
                  { backgroundColor: accentColor },
                  testingNotification && styles.testAlertBtnActive,
                ]}
                onPress={() => handleTestNotification()}
                disabled={testingNotification}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={testingNotification ? 'time' : 'volume-high'}
                  size={20}
                  color={textOnAccent}
                />
                <Text style={[styles.testAlertBtnText, { color: textOnAccent }]}>
                  {testingNotification
                    ? 'Previewing (fires in 2s)...'
                    : 'Test Selected Tone (3s)'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.testAlertHint, { color: textMuted }]}>
                Plays {activeSoundOpt.file || 'tactile vibration pulse'} with interactive notification buttons
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Data Backup & Restore Section */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="cloud-upload" size={18} color={accentColor} />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Data Backup & Restore</Text>
        </View>

        <Text style={[styles.settingDesc, { color: textSecondary }]}>
          Export your tasks to JSON so your planner data is never lost when
          switching phones or devices.
        </Text>

        <View style={styles.backupActionsRow}>
          {/* Export Button */}
          <TouchableOpacity
            style={[styles.backupBtn, { backgroundColor: inputBg, borderColor: border }]}
            onPress={handleExportBackup}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={18} color={accentColor} />
            <Text style={[styles.backupBtnText, { color: textPrimary }]}>Export Backup</Text>
          </TouchableOpacity>

          {/* Import Button */}
          <TouchableOpacity
            style={[styles.backupBtn, { backgroundColor: inputBg, borderColor: border }]}
            onPress={() => {
              triggerHaptic('light');
              setImportModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={18} color={accentColor} />
            <Text style={[styles.backupBtnText, { color: textPrimary }]}>Import Backup</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Storage & Tasks Cleanup */}
      <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="server" size={18} color={accentColor} />
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Storage & Maintenance</Text>
        </View>

        <View style={styles.statLine}>
          <Text style={[styles.statLineLabel, { color: textSecondary }]}>Total Saved Tasks</Text>
          <Text style={[styles.statLineValue, { color: textPrimary }]}>{totalCount}</Text>
        </View>
        <View style={styles.statLine}>
          <Text style={[styles.statLineLabel, { color: textSecondary }]}>Completed Tasks</Text>
          <Text style={[styles.statLineValue, { color: textPrimary }]}>{completedCount}</Text>
        </View>

        {completedCount > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { borderColor: COLORS.danger + '66', backgroundColor: COLORS.danger + '12' }]}
            onPress={() => {
              Alert.alert(
                'Clear Completed Tasks',
                `Are you sure you want to permanently delete all ${completedCount} completed task(s)?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: () => {
                      triggerHaptic('warning');
                      onClearCompletedTasks();
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="trash" size={16} color={COLORS.danger} />
            <Text style={styles.clearBtnText}>
              Clear Completed ({completedCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Developer Reset Section */}
      <View style={styles.devResetWrap}>
        <TouchableOpacity
          style={[styles.devResetBtn, { borderColor: border }]}
          onPress={handleResetPro}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-circle-outline" size={16} color={textMuted} />
          <Text style={[styles.devResetText, { color: textMuted }]}>Reset Pro Status (Dev Test)</Text>
        </TouchableOpacity>
      </View>

      {/* App Info footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: textMuted }]}>My Planner • Version 1.0.2</Text>
        <Text style={[styles.footerSubtext, { color: textMuted }]}>100% Offline • Local Storage Only</Text>
      </View>

      <View style={{ height: 110 }} />

      {/* Import Backup Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={[styles.modalHeader, { borderBottomColor: border }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Import Tasks Backup</Text>
              <TouchableOpacity
                onPress={() => setImportModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: textSecondary }]}>
              Paste your backup JSON below, or tap 'Paste from Clipboard'.
            </Text>

            <TextInput
              style={[styles.importTextInput, { backgroundColor: inputBg, borderColor: border, color: textPrimary }]}
              placeholder="Paste JSON here..."
              placeholderTextColor={textMuted}
              value={importText}
              onChangeText={setImportText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.pasteBtn, { borderColor: accentColor }]}
              onPress={handlePasteFromClipboard}
            >
              <Ionicons name="clipboard-outline" size={16} color={accentColor} />
              <Text style={[styles.pasteBtnText, { color: accentColor }]}>Paste from Clipboard</Text>
            </TouchableOpacity>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.importChoiceBtn, { backgroundColor: inputBg, borderColor: border }]}
                onPress={() => handleExecuteImport(true)}
              >
                <Text style={[styles.importChoiceBtnText, { color: textPrimary }]}>Merge with Existing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.importChoiceBtn, styles.importChoiceBtnReplace, { backgroundColor: accentColor }]}
                onPress={() => {
                  Alert.alert(
                    'Replace All Tasks',
                    'This will replace all your current tasks with the backup. Continue?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Replace All',
                        style: 'destructive',
                        onPress: () => handleExecuteImport(false),
                      },
                    ]
                  );
                }}
              >
                <Text style={[styles.importChoiceBtnText, { color: textOnAccent, fontWeight: '700' }]}>
                  Replace All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  themeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  sectionTitleRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  proStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  proStatusBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.5,
  },
  settingDesc: {
    fontSize: FONTS.sizes.sm,
    lineHeight: 19,
    marginBottom: SPACING.sm,
  },
  subLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  bgSwatchCard: {
    width: '31%',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 74,
    justifyContent: 'center',
  },
  bgSwatchCircle: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
  },
  bgSwatchName: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: FONTS.weights.medium,
  },
  bgSwatchBadge: {
    fontSize: 8,
    marginTop: 2,
    fontWeight: FONTS.weights.semibold,
  },
  accentSwatchCard: {
    width: '31%',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 70,
    justifyContent: 'center',
  },
  accentColorDot: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  accentSwatchName: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: FONTS.weights.medium,
  },
  accentSwatchBadge: {
    fontSize: 8,
    marginTop: 2,
    fontWeight: FONTS.weights.semibold,
  },
  cozyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: SPACING.md,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
  },
  upgradeBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  upgradeBannerSub: {
    fontSize: FONTS.sizes.xs,
    marginTop: 1,
  },
  vipCodeBox: {
    marginTop: SPACING.md,
  },
  vipInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  vipInput: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    borderWidth: 1,
  },
  vipRedeemBtn: {
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipRedeemBtnText: {
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  settingTextWrap: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  settingLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  reminderTimeBlock: {
    marginTop: SPACING.md,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: 6,
  },
  reminderBtnSelected: {},
  reminderBtnText: {
    fontSize: FONTS.sizes.xs,
  },
  reminderBtnTextSelected: {
    fontWeight: FONTS.weights.bold,
  },
  soundOptionsList: {
    gap: SPACING.xs + 2,
    marginBottom: SPACING.sm,
  },
  soundOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  soundOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: SPACING.sm,
  },
  soundIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundOptionName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  soundOptionDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  silentPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  silentPillText: {
    fontSize: 9,
    fontWeight: FONTS.weights.medium,
  },
  testAlertBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
  },
  channelBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weights.medium,
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  testAlertBtnActive: {
    opacity: 0.7,
  },
  testAlertBtnText: {
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
  },
  testAlertHint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  backupActionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    gap: SPACING.xs,
  },
  backupBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLineLabel: {
    fontSize: FONTS.sizes.sm,
  },
  statLineValue: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  clearBtnText: {
    color: COLORS.danger,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  devResetWrap: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  devResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 4,
  },
  devResetText: {
    fontSize: 11,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
  },
  footerSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  modalDesc: {
    fontSize: FONTS.sizes.xs,
    marginBottom: SPACING.sm,
  },
  importTextInput: {
    height: 110,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    fontSize: FONTS.sizes.xs,
    borderWidth: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: SPACING.sm,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: SPACING.xs,
    gap: 4,
    marginBottom: SPACING.md,
  },
  pasteBtnText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  importChoiceBtn: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  importChoiceBtnReplace: {},
  importChoiceBtnText: {
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
  },
});
