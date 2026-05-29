import SpInAppUpdates, { IAUUpdateKind } from 'sp-react-native-in-app-updates';
import Constants from 'expo-constants';

export const checkAppUpdate = async () => {
  if (Constants.appOwnership === 'expo') {
    console.log('[InAppUpdates] Skipping check because we are running in Expo Go.');
    return;
  }

  try {
    console.log('[InAppUpdates] Starting Android in-app update check...');
    const inAppUpdates = new SpInAppUpdates(false);
    const result = await inAppUpdates.checkNeedsUpdate();
    if (result.shouldUpdate) {
      console.log('[InAppUpdates] Update required! Target version:', result.storeVersion);
      await inAppUpdates.startUpdate({
        updateType: IAUUpdateKind.IMMEDIATE,
      });
    } else {
      console.log('[InAppUpdates] App is up to date.');
    }
  } catch (error) {
    console.warn('[InAppUpdates] Check failed:', error);
  }
};
