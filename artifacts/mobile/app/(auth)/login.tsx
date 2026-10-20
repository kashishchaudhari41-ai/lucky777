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

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!phone.trim() || !password.trim()) {
      setError("Phone and password required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Login failed");
      await login(data.token, data.user);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
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
        end={{ x: 0.5, y: 0.6 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.logoWrap}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={s.logo}
            />
            <Text style={s.brand}>LUCKY777</Text>
            <Text style={s.tagline}>Satta Matka</Text>
          </View>

          <View style={s.card}>
            <Text style={s.title}>Welcome Back</Text>
            <Text style={s.sub}>Sign in to continue</Text>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={colors.error} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={s.inputWrap}>
              <Feather name="phone" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="Mobile Number"
                placeholderTextColor={colors.mutedForeground}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                testID="input-phone"
              />
            </View>

            <View style={s.inputWrap}>
              <Feather name="lock" size={18} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                testID="input-password"
              />
              <Pressable onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Feather name={showPass ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}
              onPress={handleLogin}
              disabled={loading}
              testID="btn-login"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>LOGIN</Text>
              )}
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/register")} style={s.linkWrap}>
              <Text style={s.linkText}>
                New user?{" "}
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Register</Text>
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
    logoWrap: { alignItems: "center", marginBottom: 32 },
    logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 12 },
    brand: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: 4 },
    tagline: { fontSize: 13, color: c.mutedForeground, marginTop: 4, letterSpacing: 2 },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: c.border,
    },
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
    input: { flex: 1, color: c.text, fontSize: 15, height: "100%" },
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
