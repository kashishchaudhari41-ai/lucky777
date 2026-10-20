import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Market } from "@workspace/api-client-react";

import { useColors } from "@/hooks/useColors";

interface MarketCardProps {
  market: Market;
  onPress: () => void;
}

function getStatus(market: MarketCardProps["market"]) {
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const openDt = new Date(`${todayDate}T${market.openTime}`);
  const closeDt = new Date(`${todayDate}T${market.closeTime}`);

  if (market.status === "inactive") return "closed";
  if (now < openDt) return "upcoming";
  if (now >= openDt && now < closeDt) return market.isBettingOpen ? "open" : "closed";
  return "closed";
}

function getCountdown(targetTime: string) {
  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const target = new Date(`${todayDate}T${targetTime}`);
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`;
}

function formatResult(r?: string | null) {
  if (!r) return "**";
  return r.padEnd(2, "*");
}

export function MarketCard({ market, onPress }: MarketCardProps) {
  const colors = useColors();
  const [countdown, setCountdown] = useState<string | null>(null);
  const status = getStatus(market);

  useEffect(() => {
    if (status === "open") {
      const interval = setInterval(() => {
        setCountdown(getCountdown(market.closeTime));
      }, 1000);
      return () => clearInterval(interval);
    } else if (status === "upcoming") {
      const interval = setInterval(() => {
        setCountdown(getCountdown(market.openTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, market.openTime, market.closeTime]);

  const statusColor =
    status === "open" ? colors.success : status === "upcoming" ? colors.warning : colors.mutedForeground;

  const s = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: status === "open" ? colors.primary + "40" : colors.border,
    },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    name: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: statusColor + "20",
    },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor },
    statusText: { fontSize: 11, color: statusColor, fontWeight: "600", textTransform: "uppercase" },
    timeRow: { flexDirection: "row", marginTop: 10, gap: 8 },
    timeBlock: {
      flex: 1,
      backgroundColor: colors.muted,
      borderRadius: 10,
      padding: 10,
      alignItems: "center",
    },
    timeLabel: { fontSize: 10, color: colors.mutedForeground, marginBottom: 2, letterSpacing: 0.5 },
    timeValue: { fontSize: 13, fontWeight: "600", color: colors.text },
    resultRow: { flexDirection: "row", marginTop: 10, gap: 8, alignItems: "center" },
    resultBlock: { flex: 1, alignItems: "center" },
    resultLabel: { fontSize: 10, color: colors.mutedForeground, marginBottom: 4 },
    resultNum: { fontSize: 22, fontWeight: "800", color: colors.gold, letterSpacing: 2 },
    dash: { fontSize: 20, color: colors.mutedForeground, fontWeight: "300" },
    countdownRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
    countdownText: { fontSize: 12, color: statusColor, fontWeight: "600" },
    playBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 7,
      alignSelf: "flex-end",
      marginTop: 10,
    },
    playBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  });

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && { opacity: 0.9 }]}
      onPress={onPress}
    >
      <View style={s.row}>
        <Text style={s.name}>{market.name}</Text>
        <View style={s.statusBadge}>
          <View style={s.statusDot} />
          <Text style={s.statusText}>{status}</Text>
        </View>
      </View>

      <View style={s.timeRow}>
        <View style={s.timeBlock}>
          <Text style={s.timeLabel}>OPEN</Text>
          <Text style={s.timeValue}>{market.openTime}</Text>
        </View>
        <View style={s.timeBlock}>
          <Text style={s.timeLabel}>CLOSE</Text>
          <Text style={s.timeValue}>{market.closeTime}</Text>
        </View>
      </View>

      <View style={s.resultRow}>
        <View style={s.resultBlock}>
          <Text style={s.resultLabel}>OPEN</Text>
          <Text style={s.resultNum}>{formatResult(market.latestResult?.openNumber)}</Text>
        </View>
        <Text style={s.dash}>-</Text>
        <View style={s.resultBlock}>
          <Text style={s.resultLabel}>JODI</Text>
          <Text style={s.resultNum}>
            {market.latestResult?.openNumber && market.latestResult?.closeNumber
              ? `${market.latestResult?.openNumber?.slice(-1) ?? "*"}${market.latestResult?.closeNumber?.slice(-1) ?? "*"}`
              : "**"}
          </Text>
        </View>
        <Text style={s.dash}>-</Text>
        <View style={s.resultBlock}>
          <Text style={s.resultLabel}>CLOSE</Text>
          <Text style={s.resultNum}>{formatResult(market.latestResult?.closeNumber)}</Text>
        </View>
      </View>

      {countdown && status !== "closed" && (
        <View style={s.countdownRow}>
          <Feather name="clock" size={12} color={statusColor} />
          <Text style={s.countdownText}>
            {status === "open" ? "Closes in " : "Opens in "}
            {countdown}
          </Text>
        </View>
      )}

      {status === "open" && (
        <View style={s.playBtn}>
          <Text style={s.playBtnText}>PLAY NOW</Text>
        </View>
      )}
    </Pressable>
  );
}
