import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { accountApi } from './account';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  const status = existing.status === 'granted'
    ? existing.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('household', {
      name: 'Household updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    await accountApi.registerDeviceToken(token, Platform.OS);
  }
  return token;
}
