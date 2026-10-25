import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/context/AuthContext";

export const PUSH_TOKEN_KEY = "lucky777_push_token";

// Show alerts, sound and banner even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPush(authToken: string) {
  // Push needs a real phone (not a web page or emulator)
  if (Platform.OS === "web" || !Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Lucky777 alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#48723e",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/user/push-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ token: expoToken, platform: Platform.OS }),
  });
  if (res.ok) await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoToken);
}

// Mount once inside AuthProvider + QueryClientProvider.
export function usePushNotifications() {
  const { token: authToken } = useAuth();
  const queryClient = useQueryClient();

  // Register this phone whenever a player is logged in
  useEffect(() => {
    if (!authToken) return;
    registerForPush(authToken).catch((e) => console.warn("Push registration skipped:", e?.message ?? e));
  }, [authToken]);

  useEffect(() => {
    // New alert while the app is open: refresh the bell badge right away
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "userDashboard" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "userBalance" });
    });
    // Tapping an alert opens the notifications screen
    const tapped = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/notifications");
    });
    return () => {
      received.remove();
      tapped.remove();
    };
  }, [queryClient]);

  // App opened from a tap while it was closed
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (last && authToken) router.push("/notifications");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.notification.request.identifier]);
}
