import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const checkAppUpdate = async () => {
  // Skip on web before importing the native-only update package. Static imports
  // break Expo web builds because sp-react-native-in-app-updates has no web shim.
  if (Platform.OS === 'web') {
    return;
  }

  // Skip in Expo Go during development to prevent native module crash.
  if (Constants.appOwnership === 'expo') {
    if (__DEV__) {
      console.log('[InAppUpdates] Skipping check because we are running in Expo Go.');
    }
    return;
  }

  const { default: SpInAppUpdates, IAUUpdateKind } = await import('sp-react-native-in-app-updates');

  try {
    if (__DEV__) {
      console.log('[InAppUpdates] Starting in-app update check...');
    }
    const inAppUpdates = new SpInAppUpdates(
      false // isDebug: Set to true to mock/run checks in dev mode
    );

    const result = await inAppUpdates.checkNeedsUpdate();
    if (result.shouldUpdate) {
      if (__DEV__) {
        console.log('[InAppUpdates] Update required! Target version:', result.storeVersion);
      }

      if (Platform.OS === 'android') {
        // Immediate Update - forces user to download and update
        await inAppUpdates.startUpdate({
          updateType: IAUUpdateKind.IMMEDIATE,
        });
      } else if (Platform.OS === 'ios') {
        // iOS App Store update redirect
        await inAppUpdates.startUpdate({
          title: 'Update Available',
          message: 'A new version of the app is available. Please update to continue.',
          buttonUpgradeText: 'Update Now',
          buttonCancelText: 'Cancel',
        });
      }
    } else if (__DEV__) {
      console.log('[InAppUpdates] App is up to date.');
    }
  } catch (error) {
    console.warn('[InAppUpdates] Check failed:', error);
  }
};
