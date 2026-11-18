import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, APP_THEMES } from '../theme';
import { triggerHaptic } from '../haptics';
import { unlockWithPromoCode, purchaseProViaPlayStore } from '../billing';

export default function ProPaywallModal({
  visible,
  onClose,
  onSuccess,
  currentThemeAccent = COLORS.accent,
  theme,
}) {
  const accent = theme?.accent || currentThemeAccent;
  const textOnAccent = theme?.textOnAccent || '#121212';
  const modalBg = theme?.modalBg || COLORS.card;
  const border = theme?.border || COLORS.border;
  const inputBg = theme?.inputBg || COLORS.inputBg;
  const textPrimary = theme?.textPrimary || COLORS.text;
  const textSecondary = theme?.textSecondary || COLORS.textSecondary;
  const textMuted = theme?.textMuted || COLORS.textMuted;

  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);

  const handlePurchaseSandbox = async () => {
    try {
      setLoading(true);
      triggerHaptic('medium');
      const res = await purchaseProViaPlayStore();
      if (res.success) {
        triggerHaptic('success');
        Alert.alert('🎉 Welcome to Pro!', res.message, [
          {
            text: 'Enjoy Pro',
            onPress: () => {
              onSuccess && onSuccess();
              onClose();
            },
          },
        ]);
      } else {
        triggerHaptic('warning');
        Alert.alert('Purchase Failed', res.message);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!promoCode.trim()) {
      Alert.alert('Empty Code', 'Please enter a promo code to redeem.');
      return;
    }

    try {
      setLoading(true);
      const res = await unlockWithPromoCode(promoCode);
      if (res.success) {
        // Celebratory haptic pulse
        triggerHaptic('success');
        Alert.alert('🎉 VIP Unlocked!', res.message, [
          {
            text: 'Amazing!',
            onPress: () => {
              setPromoCode('');
              onSuccess && onSuccess();
              onClose();
            },
          },
        ]);
      } else {
        triggerHaptic('warning');
        Alert.alert('Invalid Code', res.message);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    {
      icon: 'color-palette',
      title: 'Aesthetic Accent Themes',
      desc: 'Unlock Rose Pink, Matcha Green, Lavender & Ocean Blue.',
    },
    {
      icon: 'musical-notes',
      title: 'Custom Alert Chimes',
      desc: 'Pleasant bell melodies and custom vibration alerts.',
    },
    {
      icon: 'cloud-done',
      title: 'Unlimited Offline Backups',
      desc: 'Zero-loss JSON export & instant clipboard restore.',
    },
    {
      icon: 'sparkles',
      title: 'Priority Support & Lifetime Updates',
      desc: 'One-time payment forever. No subscriptions, no ads.',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: modalBg, borderColor: border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.proPill,
                  { backgroundColor: accent + '33' },
                ]}
              >
                <Ionicons name="sparkles" size={14} color={accent} />
                <Text
                  style={[styles.proPillText, { color: accent }]}
                >
                  PLANNER PRO
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.title, { color: textPrimary }]}>Upgrade to Planner Pro</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              Unlock custom aesthetic themes, peaceful chimes, and premium productivity tools forever.
            </Text>

            {/* Theme Swatch Preview */}
            <View style={[styles.swatchPreviewContainer, { backgroundColor: inputBg, borderColor: border }]}>
              <Text style={[styles.previewHeading, { color: textSecondary }]}>INCLUDES ALL 5 PRO THEMES</Text>
              <View style={styles.swatchesRow}>
                {APP_THEMES.map((th) => (
                  <View key={th.id} style={styles.swatchCol}>
                    <View
                      style={[
                        styles.swatchCircle,
                        { backgroundColor: th.accent },
                      ]}
                    />
                    <Text style={[styles.swatchName, { color: textSecondary }]}>{th.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Perks List */}
            <View style={styles.perksList}>
              {perks.map((p, idx) => (
                <View key={idx} style={styles.perkItem}>
                  <View
                    style={[
                      styles.perkIconWrap,
                      { backgroundColor: accent + '22' },
                    ]}
                  >
                    <Ionicons
                      name={p.icon}
                      size={20}
                      color={accent}
                    />
                  </View>
                  <View style={styles.perkTextWrap}>
                    <Text style={[styles.perkTitle, { color: textPrimary }]}>{p.title}</Text>
                    <Text style={[styles.perkDesc, { color: textSecondary }]}>{p.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Lifetime Purchase Button */}
            <TouchableOpacity
              style={[
                styles.purchaseBtn,
                { backgroundColor: accent },
              ]}
              onPress={handlePurchaseSandbox}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Ionicons name="diamond" size={20} color={textOnAccent} />
              <Text style={[styles.purchaseBtnText, { color: textOnAccent }]}>
                {loading ? 'Processing...' : 'Lifetime Unlock - ₱99'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.guaranteeText, { color: textMuted }]}>
              One-time purchase • Google Play Billing sandbox ready • No subscription
            </Text>

            {/* Secret VIP / Promo Code Section */}
            <View style={styles.promoSection}>
              {!showPromoInput ? (
                <TouchableOpacity
                  onPress={() => {
                    triggerHaptic('light');
                    setShowPromoInput(true);
                  }}
                  style={styles.togglePromoBtn}
                >
                  <Ionicons name="gift-outline" size={15} color={textSecondary} />
                  <Text style={[styles.togglePromoText, { color: textSecondary }]}>
                    Have a VIP or Promo Code? Tap to redeem
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.promoInputBox, { backgroundColor: inputBg, borderColor: border }]}>
                  <Text style={[styles.promoLabel, { color: textPrimary }]}>Redeem VIP / Promo Code</Text>
                  <View style={styles.promoRow}>
                    <TextInput
                      style={[styles.promoInput, { backgroundColor: modalBg, borderColor: border, color: textPrimary }]}
                      placeholder="Enter code"
                      placeholderTextColor={textMuted}
                      value={promoCode}
                      onChangeText={setPromoCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={[
                        styles.redeemBtn,
                        { backgroundColor: accent },
                      ]}
                      onPress={handleRedeemCode}
                      disabled={loading}
                    >
                      <Text style={[styles.redeemBtnText, { color: textOnAccent }]}>Redeem</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  proPillText: {
    fontSize: 12,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  swatchPreviewContainer: {
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  swatchCol: {
    alignItems: 'center',
    gap: 4,
  },
  swatchCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ffffff33',
  },
  swatchName: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  perksList: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  perkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkTextWrap: {
    flex: 1,
  },
  perkTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  perkDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg - 2,
    borderRadius: RADIUS.xl,
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  purchaseBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#121212',
  },
  guaranteeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs + 2,
  },
  promoSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  togglePromoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  togglePromoText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  promoInputBox: {
    marginTop: SPACING.xs,
  },
  promoLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.semibold,
    marginBottom: SPACING.xs,
  },
  promoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  promoInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  redeemBtn: {
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: '#121212',
  },
});
