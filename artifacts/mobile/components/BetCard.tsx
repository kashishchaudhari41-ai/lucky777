import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Bet } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface BetCardProps {
  bet: Bet;
}

export function BetCard({ bet }: BetCardProps) {
  const colors = useColors();

  const statusColor =
    bet.status === "won"
      ? colors.success
      : bet.status === "lost"
      ? colors.error
      : bet.status === "pending"
      ? colors.warning
      : colors.mutedForeground;

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
    },
    left: { flex: 1 },
    marketName: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
    detail: { fontSize: 12, color: colors.mutedForeground },
    right: { alignItems: "flex-end" },
    amount: { fontSize: 16, fontWeight: "700", color: colors.text },
    winAmount: { fontSize: 13, fontWeight: "600", color: colors.success, marginTop: 2 },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: statusColor + "20",
      marginTop: 4,
    },
    badgeText: { fontSize: 11, color: statusColor, fontWeight: "600", textTransform: "uppercase" },
    number: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.gold,
      marginRight: 16,
      minWidth: 40,
      textAlign: "center",
    },
  });

  return (
    <View style={s.card}>
      <Text style={s.number}>{bet.numbers.map((n) => n.number).join(", ")}</Text>
      <View style={s.left}>
        <Text style={s.marketName}>{bet.marketName ?? "Market"}</Text>
        <Text style={s.detail}>
          {bet.gameType.toUpperCase()} •{" "}
          {new Date(bet.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          })}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.amount}>₹{bet.totalAmount}</Text>
        {bet.winAmount ? <Text style={s.winAmount}>+₹{bet.winAmount}</Text> : null}
        <View style={s.badge}>
          <Text style={s.badgeText}>{bet.status}</Text>
        </View>
      </View>
    </View>
  );
}
