import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !phone.trim() || !password.trim()) {
      setError("Name, phone and password required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = {
        fullName: name.trim(),
        phone: phone.trim(),
        password,
      };
      if (referral.trim()) body.referralCode = referral.trim();

      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Registration failed");
      await login(data.token, data.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  const s = styles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={["#1a3d16", "#0a0a0a"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.logoWrap}>
            <Image source={require("@/assets/images/icon.png")} style={s.logo} />
            <Text style={s.brand}>LUCKY777</Text>
          </View>

          <View style={s.card}>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.sub}>Join & start playing</Text>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {[
              { icon: "user", placeholder: "Full Name", value: name, setter: setName, type: "default" as const },
              { icon: "phone", placeholder: "Mobile Number", value: phone, setter: setPhone, type: "phone-pad" as const },
            ].map((f) => (
              <View key={f.placeholder} style={s.inputWrap}>
                <Feather name={f.icon as "user"} size={18} color={colors.mutedForeground} style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={f.value}
                  onChangeText={f.setter}
                  keyboardType={f.type}
                />
              </View>
            ))}

            <View style={s.inputWrap}>
              <Feather name="lock" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Password (min 6 chars)"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={s.inputWrap}>
              <Feather name="gift" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Referral Code (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={referral}
                onChangeText={setReferral}
                autoCapitalize="characters"
              />
            </View>

            <Pressable
              style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>CREATE ACCOUNT</Text>}
            </Pressable>

            <Pressable onPress={() => router.back()} style={s.linkWrap}>
              <Text style={s.linkText}>
                Already have account?{" "}
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Login</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flexGrow: 1, paddingHorizontal: 20 },
    logoWrap: { alignItems: "center", marginBottom: 24 },
    logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 8 },
    brand: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 4 },
    card: { backgroundColor: c.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: c.border },
    title: { fontSize: 22, fontWeight: "700", color: c.text, marginBottom: 4 },
    sub: { fontSize: 14, color: c.mutedForeground, marginBottom: 20 },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#ef44441a",
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    errorText: { color: c.error, fontSize: 13, flex: 1 },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.input,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      marginBottom: 12,
      height: 52,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: c.text, fontSize: 15 },
    eyeBtn: { padding: 4 },
    btn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      marginBottom: 16,
    },
    btnText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 1 },
    linkWrap: { alignItems: "center" },
    linkText: { color: c.mutedForeground, fontSize: 14 },
  });
