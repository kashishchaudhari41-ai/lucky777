import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetUserNotifications } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  result: "award",
  win: "star",
  deposit: "arrow-down-circle",
  withdrawal: "arrow-up-circle",
  bet: "target",
  account: "user",
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useGetUserNotifications();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const notifications = data?.notifications ?? [];

  const s = styles(colors);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.title}>Notifications</Text>
        {data?.unreadCount ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{data.unreadCount}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <View style={[s.item, !item.isRead && s.itemUnread]}>
              <View style={s.iconWrap}>
                <Feather
                  name={ICONS[item.type] ?? "bell"}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemTitle}>{item.title}</Text>
                <Text style={s.itemBody}>{item.message}</Text>
                <Text style={s.itemDate}>
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              {!item.isRead && <View style={s.unreadDot} />}
            </View>
          )}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="bell-off" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No notifications</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { flex: 1, fontSize: 20, fontWeight: "700", color: c.text },
    badge: {
      backgroundColor: c.error,
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    item: {
      flexDirection: "row",
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "flex-start",
    },
    itemUnread: { borderColor: c.primary + "40", backgroundColor: c.primary + "08" },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    itemTitle: { fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 2 },
    itemBody: { fontSize: 13, color: c.mutedForeground, lineHeight: 18 },
    itemDate: { fontSize: 11, color: c.mutedForeground, marginTop: 4 },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary,
      marginTop: 6,
    },
    empty: { alignItems: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
  });
