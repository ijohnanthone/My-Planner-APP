import AsyncStorage from '@react-native-async-storage/async-storage';

export const PRO_STORAGE_KEY = '@planner_is_pro_status_v1';
export const THEME_STORAGE_KEY = '@planner_active_theme_id_v1';
export const BG_STORAGE_KEY = '@planner_active_bg_id_v1';
export const COZY_STORAGE_KEY = '@planner_is_cozy_dim_v1';

// Pure-JS polynomial hash for secret VIP codes (avoids plaintext code scraping)
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash;
}

// Target hashes for MOMMY and VIP2026
const VALID_HASHES = [228393652, -1881374146];

// Rate-limiting cooldown state
let failedAttempts = 0;
let lastFailedTime = 0;
const COOLDOWN_MS = 10000; // 10 seconds after 3 failed attempts

/**
 * Check if the user currently holds Pro Membership from local storage.
 * @returns {Promise<boolean>}
 */
export async function checkProStatus() {
  try {
    const value = await AsyncStorage.getItem(PRO_STORAGE_KEY);
    return value === 'true';
  } catch (error) {
    if (__DEV__) console.warn('Error checking pro status:', error);
    return false;
  }
}

/**
 * Set the pro membership status in AsyncStorage.
 * @param {boolean} isPro
 */
export async function setProStatus(isPro) {
  try {
    await AsyncStorage.setItem(PRO_STORAGE_KEY, isPro ? 'true' : 'false');
    return isPro;
  } catch (error) {
    if (__DEV__) console.warn('Error setting pro status:', error);
    return false;
  }
}

/**
 * Validate and unlock Pro Membership via secret VIP Promo Code with cooldown & hash check.
 * @param {string} code
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function unlockWithPromoCode(code) {
  try {
    const now = Date.now();
    if (failedAttempts >= 3 && now - lastFailedTime < COOLDOWN_MS) {
      const remainingSec = Math.ceil((COOLDOWN_MS - (now - lastFailedTime)) / 1000);
      return {
        success: false,
        message: `Too many attempts. Please wait ${remainingSec}s before trying again.`,
      };
    }

    if (!code || typeof code !== 'string') {
      return {
        success: false,
        message: 'Please enter a valid code.',
      };
    }

    const cleaned = code.trim().toUpperCase();
    const codeHash = hashString(cleaned);

    if (VALID_HASHES.includes(codeHash)) {
      failedAttempts = 0;
      await setProStatus(true);
      return {
        success: true,
        message:
          'VIP Lifetime Unlocked! All themes, pastels, and Pro features are now yours forever ❤️',
      };
    }

    failedAttempts++;
    lastFailedTime = now;
    return {
      success: false,
      message: 'Invalid code. Please check and try again.',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error redeeming code: ' + error.message,
    };
  }
}

/**
 * Stubbed function for future RevenueCat / Google Play Billing integration.
 * In development / sandbox mode, simulates a successful one-time lifetime purchase.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function purchaseProViaPlayStore() {
  try {
    await setProStatus(true);
    return {
      success: true,
      message: 'Sandbox Purchase Successful! Welcome to Planner Pro 🎉',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Billing error: ' + error.message,
    };
  }
}

/**
 * Load complete theme settings (Background ID, Accent ID, and Cozy Dim toggle).
 * @returns {Promise<{ bgId: string, accentId: string, isCozy: boolean }>}
 */
export async function loadSavedThemeSettings() {
  try {
    const [bgId, accentId, cozyVal] = await Promise.all([
      AsyncStorage.getItem(BG_STORAGE_KEY),
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(COZY_STORAGE_KEY),
    ]);
    return {
      bgId: bgId || 'midnight',
      accentId: accentId || 'gold',
      isCozy: cozyVal === 'true',
    };
  } catch (error) {
    if (__DEV__) console.warn('Error loading theme settings:', error);
    return { bgId: 'midnight', accentId: 'gold', isCozy: false };
  }
}

/**
 * Save complete theme settings to AsyncStorage.
 * @param {{ bgId?: string, accentId?: string, isCozy?: boolean }}
 */
export async function saveThemeSettings({ bgId, accentId, isCozy }) {
  try {
    const promises = [];
    if (bgId !== undefined) promises.push(AsyncStorage.setItem(BG_STORAGE_KEY, bgId));
    if (accentId !== undefined) promises.push(AsyncStorage.setItem(THEME_STORAGE_KEY, accentId));
    if (isCozy !== undefined) promises.push(AsyncStorage.setItem(COZY_STORAGE_KEY, isCozy ? 'true' : 'false'));
    await Promise.all(promises);
  } catch (error) {
    if (__DEV__) console.warn('Error saving theme settings:', error);
  }
}

// Backwards-compatible load/save theme ID
export async function loadSavedTheme() {
  const { accentId } = await loadSavedThemeSettings();
  return accentId;
}

export async function saveThemeId(themeId) {
  await saveThemeSettings({ accentId: themeId });
  return themeId;
}

/**
 * Reset Pro status for developer testing.
 * Reverts pro status to false and resets to midnight dark and gold free default.
 * @returns {Promise<boolean>}
 */
export async function resetProStatusForDev() {
  try {
    await AsyncStorage.setItem(PRO_STORAGE_KEY, 'false');
    await saveThemeSettings({ bgId: 'midnight', accentId: 'gold', isCozy: false });
    return false;
  } catch (error) {
    if (__DEV__) console.warn('Error resetting pro status:', error);
    return false;
  }
}
