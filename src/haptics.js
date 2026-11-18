import * as Haptics from 'expo-haptics';

/**
 * Safely trigger a haptic feedback pulse.
 * Wrapped in try/catch to ensure zero crashes on unsupported devices.
 * @param {'light' | 'medium' | 'heavy' | 'success' | 'warning'} type
 */
export async function triggerHaptic(type = 'medium') {
  try {
    switch (type) {
      case 'light':
        if (typeof Haptics?.impactAsync === 'function') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        break;
      case 'heavy':
        if (typeof Haptics?.impactAsync === 'function') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        break;
      case 'success':
        if (typeof Haptics?.notificationAsync === 'function') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        break;
      case 'warning':
        if (typeof Haptics?.notificationAsync === 'function') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        break;
      case 'medium':
      default:
        if (typeof Haptics?.impactAsync === 'function') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        break;
    }
  } catch (error) {
    // Gracefully ignore haptics errors on devices without vibrator motors
  }
}
