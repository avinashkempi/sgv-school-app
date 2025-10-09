import { Linking } from "react-native";

export const openAppLink = async (appUrl, fallbackUrl) => {
  try {
    const supported = await Linking.canOpenURL(appUrl);
    if (supported) return Linking.openURL(appUrl);
    return Linking.openURL(fallbackUrl);
  } catch (err) {
    console.error("Failed to open link:", err);
  }
};

export const dial = (phone) => Linking.openURL(`tel:${phone}`);
export const email = (addr) => Linking.openURL(`mailto:${addr}`);
