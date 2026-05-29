import SpInAppUpdates from 'sp-react-native-in-app-updates';
import Constants from 'expo-constants';

export const checkAppUpdate = async () => {
  if (Constants.appOwnership === 'expo') {
    console.log('[InAppUpdates] Skipping check because we are running in Expo Go.');
    return;
  }

  try {
    console.log('[InAppUpdates] Starting iOS in-app update check...');
    const inAppUpdates = new SpInAppUpdates(false);
    const result = await inAppUpdates.checkNeedsUpdate();
    if (result.shouldUpdate) {
      console.log('[InAppUpdates] Update required! Target version:', result.storeVersion);
      await inAppUpdates.startUpdate({
        title: 'Update Available',
        message: 'A new version of the app is available. Please update to continue.',
        buttonUpgradeText: 'Update Now',
        buttonCancelText: 'Cancel',
      });
    } else {
      console.log('[InAppUpdates] App is up to date.');
    }
  } catch (error) {
    console.warn('[InAppUpdates] Check failed:', error);
  }
};
