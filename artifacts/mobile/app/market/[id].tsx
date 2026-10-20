import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGetMarket } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const BET_TYPES = [
  { key: "single", label: "Single", desc: "1 digit (0-9)", maxLen: 1 },
  { key: "jodi", label: "Jodi", desc: "2 digits (00-99)", maxLen: 2 },
  { key: "panna", label: "Panna", desc: "3 digits", maxLen: 3 },
];

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshBalance, token } = useAuth();

  const { data: market, isLoading } = useGetMarket(id ?? "");

  const [betType, setBetType] = useState("single");
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [session, setSession] = useState<"open" | "close">("open");
  const [placing, setPlacing] = useState(false);

  const maxLen = BET_TYPES.find((b) => b.key === betType)?.maxLen ?? 1;

  async function handlePlaceBet() {
    if (!number.trim() || number.length !== maxLen) {
      Alert.alert("Invalid", `Enter a ${maxLen}-digit number`);
      return;
    }
    const amt = parseInt(amount, 10);
    if (!amt || amt < 10) {
      Alert.alert("Invalid", "Minimum bet amount is ₹10");
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch(
        `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/bets/place`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            marketId: id ?? "",
            gameType: betType,
            numbers: [{ number: number.trim(), amount: amt, session }],
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place bet");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshBalance();
      setNumber("");
      setAmount("");
      Alert.alert("Bet Placed!", `₹${amt} on ${number} (${betType.toUpperCase()})`, [
        { text: "Place Another" },
        { text: "Go Back", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to place bet";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", msg);
    } finally {
      setPlacing(false);
    }
  }

  const s = styles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (isLoading || !market) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn} testID="btn-back">
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>{market.name}</Text>
        <View style={s.statusBadge}>
          <View style={[s.statusDot, { backgroundColor: market.isBettingOpen ? colors.success : colors.mutedForeground }]} />
          <Text style={[s.statusText, { color: market.isBettingOpen ? colors.success : colors.mutedForeground }]}>
            {market.isBettingOpen ? "Open" : "Closed"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.infoRow}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Open Time</Text>
            <Text style={s.infoValue}>{market.openTime}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Close Time</Text>
            <Text style={s.infoValue}>{market.closeTime}</Text>
          </View>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Result</Text>
            <Text style={[s.infoValue, { color: colors.gold }]}>
              {market.latestResult?.openNumber ?? "*"}-{market.latestResult?.closeNumber ?? "*"}
            </Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Session</Text>
        <View style={s.sessionRow}>
          {(["open", "close"] as const).map((s_) => (
            <Pressable
              key={s_}
              style={[s.sessionBtn, session === s_ && s.sessionBtnActive]}
              onPress={() => setSession(s_)}
            >
              <Text style={[s.sessionBtnText, session === s_ && s.sessionBtnTextActive]}>
                {s_.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionLabel}>Bet Type</Text>
        <View style={s.betTypeRow}>
          {BET_TYPES.map((bt) => (
            <Pressable
              key={bt.key}
              style={[s.betTypeBtn, betType === bt.key && s.betTypeBtnActive]}
              onPress={() => {
                setBetType(bt.key);
                setNumber("");
              }}
            >
              <Text style={[s.betTypeName, betType === bt.key && s.betTypeNameActive]}>
                {bt.label}
              </Text>
              <Text style={[s.betTypeDesc, betType === bt.key && { color: "#fff" }]}>
                {bt.desc}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={s.sectionLabel}>Number</Text>
        <TextInput
          style={s.numberInput}
          placeholder={`Enter ${maxLen}-digit number`}
          placeholderTextColor={colors.mutedForeground}
          value={number}
          onChangeText={(t) => setNumber(t.replace(/\D/g, "").slice(0, maxLen))}
          keyboardType="number-pad"
          maxLength={maxLen}
          testID="input-number"
        />

        <Text style={s.sectionLabel}>Amount</Text>
        <View style={s.quickAmounts}>
          {QUICK_AMOUNTS.map((qa) => (
            <Pressable
              key={qa}
              style={[s.qaBtn, amount === String(qa) && s.qaBtnActive]}
              onPress={() => setAmount(String(qa))}
            >
              <Text style={[s.qaBtnText, amount === String(qa) && { color: "#fff" }]}>₹{qa}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={s.amountInput}
          placeholder="Or enter custom amount"
          placeholderTextColor={colors.mutedForeground}
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
          testID="input-amount"
        />

        <Pressable
          style={({ pressed }) => [s.placeBetBtn, pressed && { opacity: 0.85 }]}
          onPress={handlePlaceBet}
          disabled={placing}
          testID="btn-place-bet"
        >
          {placing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="zap" size={18} color="#fff" />
              <Text style={s.placeBetText}>PLACE BET {amount ? `₹${amount}` : ""}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: c.text },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      backgroundColor: c.card,
    },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: "600" },
    infoRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 20,
      gap: 8,
    },
    infoBlock: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: c.border,
    },
    infoLabel: { fontSize: 10, color: c.mutedForeground, marginBottom: 4 },
    infoValue: { fontSize: 14, fontWeight: "700", color: c.text },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: c.mutedForeground,
      marginHorizontal: 16,
      marginBottom: 8,
      marginTop: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sessionRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, gap: 10 },
    sessionBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    sessionBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    sessionBtnText: { fontWeight: "600", color: c.mutedForeground, fontSize: 13 },
    sessionBtnTextActive: { color: "#fff" },
    betTypeRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 16, gap: 8 },
    betTypeBtn: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    betTypeBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    betTypeName: { fontSize: 14, fontWeight: "700", color: c.text, marginBottom: 2 },
    betTypeNameActive: { color: "#fff" },
    betTypeDesc: { fontSize: 10, color: c.mutedForeground },
    numberInput: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      height: 56,
      fontSize: 24,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      letterSpacing: 8,
    },
    quickAmounts: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    qaBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    qaBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    qaBtnText: { fontSize: 13, fontWeight: "600", color: c.text },
    amountInput: {
      marginHorizontal: 16,
      marginBottom: 20,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      height: 50,
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    placeBetBtn: {
      marginHorizontal: 16,
      backgroundColor: c.primary,
      borderRadius: 14,
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 20,
    },
    placeBetText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  });
