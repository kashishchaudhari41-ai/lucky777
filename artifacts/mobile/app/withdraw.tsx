import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
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

import { useWithdrawalRequest, useGetUserBalance } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useColors } from "@/hooks/useColors";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function WithdrawScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const { minWithdrawal } = useAppConfig();

  const { data: balData } = useGetUserBalance();
  const withdraw = useWithdrawalRequest();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const balance = balData?.balance ?? 0;

  async function handleSubmit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt < minWithdrawal) {
      Alert.alert("Invalid", `Minimum withdrawal is ₹${minWithdrawal}`);
      return;
    }
    if (amt > balance) {
      Alert.alert("Insufficient", "You don't have enough balance");
      return;
    }
    if (!/^[\w.\-]{2,}@[A-Za-z][A-Za-z0-9.\-]{1,}$/.test(upiId.trim())) {
      Alert.alert("Invalid", "Enter a valid UPI ID (e.g. name@upi)");
      return;
    }
    try {
      await withdraw.mutateAsync({
        data: { amount: amt, method: "upi", upiId: upiId.trim() },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshBalance();
      Alert.alert(
        "Request Submitted!",
        "Your withdrawal will be processed within 24 hours.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to submit";
      Alert.alert("Error", msg);
    }
  }

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.title}>Withdraw</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.balCard}>
          <Text style={s.balLabel}>Available Balance</Text>
          <Text style={s.balAmount}>₹{Number(balance).toLocaleString("en-IN")}</Text>
        </View>

        <Text style={s.label}>Amount to Withdraw</Text>
        <View style={s.quickRow}>
          {QUICK_AMOUNTS.map((qa) => (
            <Pressable
              key={qa}
              style={[s.qaBtn, amount === String(qa) && s.qaBtnActive, qa > balance && s.qaBtnDisabled]}
              onPress={() => qa <= balance && setAmount(String(qa))}
            >
              <Text style={[s.qaBtnText, amount === String(qa) && { color: "#fff" }, qa > balance && { color: colors.mutedForeground }]}>
                ₹{qa}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={s.input}
          placeholder={`Enter amount (min ₹${minWithdrawal})`}
          placeholderTextColor={colors.mutedForeground}
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
        />

        <Text style={s.label}>Your UPI ID</Text>
        <TextInput
          style={s.input}
          placeholder="yourname@upi"
          placeholderTextColor={colors.mutedForeground}
          value={upiId}
          onChangeText={setUpiId}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <View style={s.noteCard}>
          <Feather name="info" size={14} color={colors.warning} />
          <Text style={s.noteText}>
            Withdrawals are processed within 24 hours. Minimum ₹{minWithdrawal}.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSubmit}
          disabled={withdraw.isPending}
        >
          {withdraw.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>WITHDRAW ₹{amount || "0"}</Text>
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
      gap: 14,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { fontSize: 20, fontWeight: "700", color: c.text },
    balCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.primary + "40",
    },
    balLabel: { fontSize: 13, color: c.mutedForeground, marginBottom: 4 },
    balAmount: { fontSize: 32, fontWeight: "800", color: c.text },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: c.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    qaBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    qaBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    qaBtnDisabled: { opacity: 0.4 },
    qaBtnText: { fontSize: 13, fontWeight: "600", color: c.text },
    input: {
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      height: 52,
      fontSize: 15,
      color: c.text,
      marginBottom: 16,
    },
    noteCard: {
      flexDirection: "row",
      gap: 8,
      backgroundColor: c.warning + "15",
      borderRadius: 10,
      padding: 12,
      marginBottom: 20,
      alignItems: "flex-start",
    },
    noteText: { flex: 1, fontSize: 13, color: c.warning, lineHeight: 18 },
    submitBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  });
