import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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

import { useAddMoneyRequest, useGetUpiDetails } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AddMoneyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { refreshBalance } = useAuth();
  const [amount, setAmount] = useState("");
  const [utrRef, setUtrRef] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: upiData } = useGetUpiDetails();
  const addMoney = useAddMoneyRequest();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function copyUpi() {
    if (upiData?.upiId) {
      await Clipboard.setStringAsync(upiData.upiId);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSubmit() {
    const amt = parseInt(amount, 10);
    if (!amt || amt < 100) {
      Alert.alert("Invalid", "Minimum deposit is ₹100");
      return;
    }
    if (!utrRef.trim()) {
      Alert.alert("Required", "Enter UTR/Transaction Reference");
      return;
    }
    try {
      await addMoney.mutateAsync({
        data: {
          amount: amt,
          utrNumber: utrRef.trim(),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshBalance();
      Alert.alert("Submitted!", "Your deposit request has been submitted. It will be approved within 30 minutes.", [
        { text: "OK", onPress: () => router.back() },
      ]);
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
        <Text style={s.title}>Add Money</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {upiData?.upiId && (
          <View style={s.upiCard}>
            <Feather name="credit-card" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.upiLabel}>Pay to UPI ID</Text>
              <Text style={s.upiId}>{upiData.upiId}</Text>
            </View>
            <Pressable onPress={copyUpi} style={s.copyBtn}>
              <Feather name={copied ? "check" : "copy"} size={16} color={copied ? colors.success : colors.primary} />
              <Text style={[s.copyText, copied && { color: colors.success }]}>
                {copied ? "Copied" : "Copy"}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={s.stepsCard}>
          {[
            "Copy the UPI ID above",
            "Pay using any UPI app (PhonePe, GPay, Paytm)",
            "Enter the amount and UTR reference below",
            "Submit — approved within 30 minutes",
          ].map((step, i) => (
            <View key={i} style={s.step}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={s.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        <Text style={s.label}>Amount</Text>
        <View style={s.quickRow}>
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
          style={s.input}
          placeholder="Enter amount (min ₹100)"
          placeholderTextColor={colors.mutedForeground}
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
        />

        <Text style={s.label}>UTR / Transaction Reference</Text>
        <TextInput
          style={s.input}
          placeholder="Enter 12-digit UTR number"
          placeholderTextColor={colors.mutedForeground}
          value={utrRef}
          onChangeText={setUtrRef}
          autoCapitalize="characters"
        />

        <Pressable
          style={({ pressed }) => [s.submitBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSubmit}
          disabled={addMoney.isPending}
        >
          {addMoney.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>SUBMIT REQUEST</Text>
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
    upiCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.primary + "40",
    },
    upiLabel: { fontSize: 11, color: c.mutedForeground, marginBottom: 2 },
    upiId: { fontSize: 16, fontWeight: "700", color: c.text },
    upiName: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
    copyBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    copyText: { color: c.primary, fontWeight: "600", fontSize: 13 },
    stepsCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
    },
    step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    stepNum: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    stepNumText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    stepText: { flex: 1, fontSize: 13, color: c.text, lineHeight: 20 },
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
    submitBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      height: 54,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 },
  });
