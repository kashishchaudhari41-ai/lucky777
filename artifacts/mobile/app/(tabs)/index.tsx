import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetMarkets, useGetRecentResults, useGetUserBalance, useGetUserDashboard } from "@workspace/api-client-react";
import { MarketCard } from "@/components/MarketCard";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, balanceTrigger } = useAuth();

  const { data: marketsData, isLoading: loadingMarkets, refetch: refetchMarkets } =
    useGetMarkets();
  const { data: balanceData, refetch: refetchBalance } = useGetUserBalance({
    query: { queryKey: ["userBalance", balanceTrigger] },
  });
  const { data: resultsData } = useGetRecentResults();
  // Polled every 30s so new notifications (deposit approved, bet won...) light up the bell
  const { data: dashData } = useGetUserDashboard({ query: { queryKey: ["userDashboard", balanceTrigger], refetchInterval: 30000 } });
  const unread = dashData?.unreadNotifications ?? 0;

  const onRefresh = useCallback(() => {
    refetchMarkets();
    refetchBalance();
  }, [refetchMarkets, refetchBalance]);

  const balance = balanceData?.balance ?? user?.balance ?? 0;
  const markets = marketsData?.markets ?? [];
  const results = resultsData?.results?.slice(0, 8) ?? [];

  const s = styles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 90 }}
      refreshControl={
        <RefreshControl onRefresh={onRefresh} refreshing={false} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={s.greeting}>Jai Matka 🎯</Text>
          <Text style={s.userName}>{user?.fullName ?? "Player"}</Text>
        </View>
        <Pressable onPress={() => router.push("/notifications")} style={s.notifBtn}>
          <Feather name="bell" size={22} color={colors.text} />
          {unread > 0 && (
            <View style={s.bellBadge}>
              <Text style={s.bellBadgeText}>{unread > 9 ? "9+" : unread}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Pressable style={s.balanceCard} onPress={() => router.push("/(tabs)/wallet")}>
        <View>
          <Text style={s.balLabel}>Wallet Balance</Text>
          <Text style={s.balAmount}>₹{Number(balance).toLocaleString("en-IN")}</Text>
        </View>
        <View style={s.balActions}>
          <Pressable style={s.addBtn} onPress={() => router.push("/add-money")}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add Money</Text>
          </Pressable>
        </View>
      </Pressable>

      {results.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Today's Results</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.resultsRow}>
            {results.map((r) => (
              <View key={r.id} style={s.resultChip}>
                <Text style={s.resultMarket} numberOfLines={1}>{r.marketName ?? "Market"}</Text>
                <Text style={s.resultNum}>
                  {r.openNumber ?? "*"}-{r.jodiNumber ?? "**"}-{r.closeNumber ?? "*"}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <Text style={s.sectionTitle}>Markets</Text>

      {loadingMarkets ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : markets.length === 0 ? (
        <View style={s.emptyState}>
          <Feather name="inbox" size={40} color={colors.mutedForeground} />
          <Text style={s.emptyText}>No markets available</Text>
        </View>
      ) : (
        <FlatList
          data={markets}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MarketCard
              market={item}
              onPress={() => router.push(`/market/${item.id}`)}
            />
          )}
          scrollEnabled={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      )}
    </ScrollView>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    greeting: { fontSize: 13, color: c.mutedForeground, marginBottom: 2 },
    userName: { fontSize: 20, fontWeight: "700", color: c.text },
    notifBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    bellBadge: {
      position: "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: "#ef4444",
      alignItems: "center",
      justifyContent: "center",
    },
    bellBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    balanceCard: {
      marginHorizontal: 16,
      marginBottom: 20,
      padding: 20,
      borderRadius: 16,
      backgroundColor: c.primary,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    balLabel: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 4 },
    balAmount: { fontSize: 28, fontWeight: "800", color: "#fff" },
    balActions: {},
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    addBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
      marginHorizontal: 16,
      marginBottom: 12,
      marginTop: 4,
    },
    resultsRow: { marginBottom: 16 },
    resultChip: {
      backgroundColor: c.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginLeft: 16,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 120,
    },
    resultMarket: { fontSize: 11, color: c.mutedForeground, marginBottom: 4 },
    resultNum: { fontSize: 16, fontWeight: "800", color: c.gold, letterSpacing: 1 },
    emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: c.mutedForeground },
  });
