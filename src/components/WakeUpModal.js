import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { triggerHaptic } from '../haptics';
import { cancelExistingNotificationsForTask } from '../notifications';

// Generate a random math challenge with 4 choices
function generateMathProblem() {
  const op = Math.random() > 0.3 ? '+' : '-';
  let a, b, answer;
  if (op === '+') {
    a = Math.floor(Math.random() * 40) + 12; // 12..51
    b = Math.floor(Math.random() * 30) + 11; // 11..40
    answer = a + b;
  } else {
    a = Math.floor(Math.random() * 50) + 30; // 30..79
    b = Math.floor(Math.random() * 25) + 10; // 10..34
    answer = a - b;
  }

  // 3 distinct realistic distractors
  const distractors = new Set();
  distractors.add(answer + 10);
  distractors.add(answer - 10);
  distractors.add(answer + 2);
  distractors.add(answer - 3);
  distractors.delete(answer);

  const choices = Array.from(distractors).slice(0, 3);
  choices.push(answer);
  // Shuffle choices
  choices.sort(() => Math.random() - 0.5);

  return {
    equation: `${a} ${op} ${b}`,
    answer,
    choices,
  };
}

export default function WakeUpModal({
  visible,
  task,
  onDismiss,
  onCompleteTask,
  theme,
}) {
  const accent = theme?.accent || COLORS.accent;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const modalBg = theme?.modalBg || COLORS.card;
  const border = theme?.border || COLORS.border;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;
  const dangerColor = theme?.danger || COLORS.danger;
  const inputBg = theme?.inputBg || COLORS.inputBg;

  const [problem, setProblem] = useState(generateMathProblem);
  const [solved, setSolved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse effect on the Eye alarm badge
  useEffect(() => {
    if (!visible) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visible, pulseAnim]);

  // Vibrate intermittently when alarm challenge is active
  useEffect(() => {
    if (visible && !solved) {
      try {
        Vibration.vibrate([0, 450, 200, 450]);
      } catch (e) {}

      const interval = setInterval(() => {
        try {
          Vibration.vibrate([0, 450, 200, 450]);
        } catch (e) {}
      }, 3500);

      return () => {
        clearInterval(interval);
        try {
          Vibration.cancel();
        } catch (e) {}
      };
    } else {
      try {
        Vibration.cancel();
      } catch (e) {}
    }
  }, [visible, solved]);

  // Reset problem when modal opens
  useEffect(() => {
    if (visible) {
      setProblem(generateMathProblem());
      setSolved(false);
      setErrorMsg('');
    }
  }, [visible]);

  const handleSelectChoice = async (val) => {
    if (val === problem.answer) {
      triggerHaptic('success');
      try {
        Vibration.cancel();
      } catch (e) {}
      setSolved(true);
      setErrorMsg('');

      // Cancel remaining 5-burst backup alarms for this task so it stops ringing
      if (task?.id) {
        await cancelExistingNotificationsForTask(task.id);
      }
    } else {
      triggerHaptic('warning');
      setErrorMsg('Incorrect! Try again to wake up your mind 🧠');
      // Generate fresh problem on wrong answer to prevent rapid blind guessing
      setTimeout(() => {
        setProblem(generateMathProblem());
      }, 500);
    }
  };

  const handleCompleteAndClose = () => {
    try {
      Vibration.cancel();
    } catch (e) {}
    if (task?.id && onCompleteTask) {
      onCompleteTask(task.id);
    }
    onDismiss && onDismiss();
  };

  const handleDismissOnly = () => {
    try {
      Vibration.cancel();
    } catch (e) {}
    onDismiss && onDismiss();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleDismissOnly}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialogCard, { backgroundColor: modalBg, borderColor: dangerColor }]}>
          {/* Pulsing Eye Icon */}
          <Animated.View
            style={[
              styles.eyeIconWrap,
              {
                backgroundColor: dangerColor + '20',
                borderColor: dangerColor,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <Ionicons name="eye" size={36} color={dangerColor} />
          </Animated.View>

          <View style={styles.badgeRow}>
            <View style={[styles.burstPill, { backgroundColor: dangerColor + '22', borderColor: dangerColor }]}>
              <Text style={[styles.burstPillText, { color: dangerColor }]}>
                HEAVY SLEEPER ALARM
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>
            Wake-Up Challenge
          </Text>

          <Text style={[styles.taskTitle, { color: accent }]} numberOfLines={2}>
            {task?.icon ? `${task.icon} ` : ''}{task?.title || 'Scheduled Task Alert'}
          </Text>

          {!solved ? (
            <View style={styles.challengeBox}>
              <Text style={[styles.instructions, { color: textSecondary }]}>
                Solve this morning puzzle to confirm you are awake:
              </Text>

              <View style={[styles.equationCard, { backgroundColor: inputBg, borderColor: border }]}>
                <Text style={[styles.equationText, { color: textPrimary }]}>
                  {problem.equation} = ?
                </Text>
              </View>

              {errorMsg ? (
                <Text style={[styles.errorText, { color: dangerColor }]}>
                  {errorMsg}
                </Text>
              ) : null}

              {/* Choices Grid */}
              <View style={styles.choicesGrid}>
                {problem.choices.map((choice, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.choiceBtn,
                      { backgroundColor: inputBg, borderColor: border },
                    ]}
                    onPress={() => handleSelectChoice(choice)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.choiceBtnText, { color: textPrimary }]}>
                      {choice}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.solvedBox}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={theme?.success || COLORS.success}
                style={{ alignSelf: 'center', marginBottom: SPACING.sm }}
              />
              <Text style={[styles.solvedTitle, { color: theme?.success || COLORS.success }]}>
                Brain Awoken! ☀️
              </Text>
              <Text style={[styles.solvedSub, { color: textSecondary }]}>
                Alarm disarmed. All 5 backup alerts have been silenced.
              </Text>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: accent, marginTop: SPACING.md }]}
                onPress={handleCompleteAndClose}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={textOnAccent} />
                <Text style={[styles.actionBtnText, { color: textOnAccent }]}>
                  Mark Task Complete
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dismissBtn, { backgroundColor: inputBg, borderColor: border }]}
                onPress={handleDismissOnly}
                activeOpacity={0.8}
              >
                <Text style={[styles.dismissBtnText, { color: textSecondary }]}>
                  Dismiss Alarm
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!solved && (
            <TouchableOpacity
              style={styles.emergencyBtn}
              onPress={handleDismissOnly}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.emergencyBtnText, { color: textMuted }]}>
                Emergency Silence
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  eyeIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    marginBottom: SPACING.xs,
  },
  burstPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  burstPillText: {
    fontSize: 10,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  challengeBox: {
    width: '100%',
    alignItems: 'center',
  },
  instructions: {
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  equationCard: {
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  equationText: {
    fontSize: 28,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    width: '100%',
    justifyContent: 'space-between',
  },
  choiceBtn: {
    width: '48%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnText: {
    fontSize: 20,
    fontWeight: FONTS.weights.bold,
  },
  solvedBox: {
    width: '100%',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  solvedTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    textAlign: 'center',
  },
  solvedSub: {
    fontSize: FONTS.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  dismissBtn: {
    width: '100%',
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  dismissBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  emergencyBtn: {
    marginTop: SPACING.lg,
    paddingVertical: 4,
  },
  emergencyBtnText: {
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
